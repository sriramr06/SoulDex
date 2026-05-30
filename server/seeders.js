require('dotenv').config();
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/database');
const Character = require('./models/Character');

const dataPath = path.join(__dirname, 'data', 'characters.json');

const seedCharacters = async () => {
  try {
    await connectDB();

    const rawData = fs.readFileSync(dataPath, 'utf8');
    const characters = JSON.parse(rawData);

    if (!Array.isArray(characters)) {
      throw new Error('Character data must be an array');
    }

    // Preprocess character objects to support fallback variables
    const processedCharacters = characters.map(char => {
      if (!char.slug && char.name) {
        char.slug = char.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      }
      if (!char.romajiName && char.name) {
        char.romajiName = char.name;
      }
      if (!char.race) {
        char.race = char.type || 'Unknown';
      }
      if (char.race === 'Visorde') {
        char.race = 'Visored';
      }
      if (!char.status) {
        char.status = 'Unknown';
      }
      if (char.isOriginalCharacter === undefined) {
        char.isOriginalCharacter = false;
      }

      // Map organization
      let group = char.group || '';
      if (!group && char.affiliation) {
        if (Array.isArray(char.affiliation)) {
          const gotei = char.affiliation.find(a => a.toLowerCase().includes('gotei'));
          group = gotei || char.affiliation[0] || '';
        } else {
          group = char.affiliation;
        }
      }
      char.organization = {
        group: group || '',
        division: char.division || '',
        rank: char.rank || ''
      };

      // Map spiritualPower
      const raceLower = char.race.toLowerCase();
      const zan = char.zanpakuto;
      const power = {
        powerType: char.race,
        zanpakutoName: '',
        shikai: '',
        bankai: '',
        hollowMask: '',
        spiritWeapon: '',
        schrift: '',
        vollstandig: '',
        resurreccionName: '',
        releaseCommand: '',
        segundaEtapa: '',
        aspectOfDeath: '',
        fullbringName: '',
        focusObject: '',
        abilityDetail: '',
        customAbilities: ''
      };

      if (char.ability) {
        power.schrift = char.ability;
      }
      if (char.resurrection) {
        power.resurreccionName = char.resurrection;
      }

      if (zan && typeof zan === 'object') {
        if (raceLower.includes('shinigami') || raceLower.includes('visored') || raceLower.includes('hybrid')) {
          power.zanpakutoName = zan.name || '';
          power.shikai = Array.isArray(zan.shikai) ? zan.shikai.join(' / ') : (zan.shikai || '');
          power.bankai = Array.isArray(zan.bankai) ? zan.bankai.join(' / ') : (zan.bankai || '');
          
          const releaseCmd = zan.releaseCommand || zan['release Command'] || '';
          if (releaseCmd && !power.shikai.includes(releaseCmd)) {
            power.shikai = power.shikai ? `${power.shikai} (Command: ${releaseCmd})` : releaseCmd;
          }
        } else if (raceLower.includes('quincy')) {
          power.spiritWeapon = zan.spiritWeapon || '';
          power.schrift = zan.schrift || char.ability || '';
          power.vollstandig = zan.vollstandig || '';
        } else if (raceLower.includes('arrancar') || raceLower.includes('espada') || raceLower.includes('hollow')) {
          power.resurreccionName = zan.name || char.resurrection || '';
          power.releaseCommand = zan.releaseCommand || zan['release Command'] || '';
          power.segundaEtapa = zan.segundaEtapa || '';
          power.aspectOfDeath = zan.aspectOfDeath || '';
        } else if (raceLower.includes('fullbringer')) {
          power.fullbringName = zan.name || '';
          power.focusObject = zan.focusObject || '';
          power.abilityDetail = zan.abilityDetail || '';
        } else {
          power.customAbilities = JSON.stringify(zan);
        }
      } else if (typeof zan === 'string' && zan) {
        if (raceLower.includes('shinigami') || raceLower.includes('visored') || raceLower.includes('hybrid')) {
          power.zanpakutoName = zan;
        } else if (raceLower.includes('quincy')) {
          power.spiritWeapon = zan;
        } else if (raceLower.includes('arrancar') || raceLower.includes('espada') || raceLower.includes('hollow')) {
          power.resurreccionName = zan;
        } else if (raceLower.includes('fullbringer')) {
          power.fullbringName = zan;
        } else {
          power.customAbilities = zan;
        }
      }

      char.spiritualPower = power;

      // Clean up legacy flat keys that shouldn't be on the root (optional, but clean)
      delete char.division;
      delete char.rank;
      delete char.zanpakuto;
      delete char.resurrection;
      delete char.ability;

      return char;
    });

    // 1. Delete all existing characters in the collection
    await Character.deleteMany();

    // 2. Insert the fresh preprocessed list
    await Character.insertMany(processedCharacters);

    console.log(`Seed complete: ${processedCharacters.length} characters inserted.`);
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedCharacters();
}
