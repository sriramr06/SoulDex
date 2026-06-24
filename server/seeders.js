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
    const processedCharacters = characters.map((char) => {
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
          const gotei = char.affiliation.find((a) =>
            a.toLowerCase().includes('gotei'),
          );
          group = gotei || char.affiliation[0] || '';
        } else {
          group = char.affiliation;
        }
      }
      char.organization = {
        group: group || '',
        division: char.division || '',
        rank: char.rank || '',
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
        customAbilities: '',
      };

      // Map root-level power properties that might be present
      if (char.ability) {
        if (raceLower.includes('quincy')) {
          power.schrift = char.ability;
        } else {
          power.abilityDetail = char.ability;
        }
      }
      if (char.schrift) power.schrift = char.schrift;
      if (char.spiritWeapon || char.spirit_weapon) power.spiritWeapon = char.spiritWeapon || char.spirit_weapon;
      if (char.vollstandig) power.vollstandig = char.vollstandig;
      if (char.resurrection || char['Resurrección'] || char.resurreccionName) {
        power.resurreccionName = char.resurrection || char['Resurrección'] || char.resurreccionName;
      }
      if (char.aspectOfDeath) power.aspectOfDeath = char.aspectOfDeath;
      if (char.segundaEtapa) power.segundaEtapa = char.segundaEtapa;
      if (char.releaseCommand) power.releaseCommand = char.releaseCommand;
      if (char.fullbringName) power.fullbringName = char.fullbringName;
      if (char.focusObject) power.focusObject = char.focusObject;

      if (zan && typeof zan === 'object') {
        if (
          raceLower.includes('shinigami') ||
          raceLower.includes('visored') ||
          raceLower.includes('hybrid')
        ) {
          power.zanpakutoName = zan.name || power.zanpakutoName;
          power.shikai = Array.isArray(zan.shikai)
            ? zan.shikai.join(' / ')
            : zan.shikai || '';
          power.bankai = Array.isArray(zan.bankai)
            ? zan.bankai.join(' / ')
            : zan.bankai || '';

          const releaseCmd = zan.releaseCommand || zan['release Command'] || power.releaseCommand || '';
          if (releaseCmd && !power.shikai.includes(releaseCmd)) {
            power.shikai = power.shikai
              ? `${power.shikai} (Command: ${releaseCmd})`
              : releaseCmd;
          }
        } else if (raceLower.includes('quincy')) {
          power.spiritWeapon = zan.spiritWeapon || power.spiritWeapon;
          power.schrift = zan.schrift || power.schrift;
          power.vollstandig = zan.vollstandig || power.vollstandig;
        } else if (
          raceLower.includes('arrancar') ||
          raceLower.includes('espada') ||
          raceLower.includes('hollow')
        ) {
          power.resurreccionName = zan.name || power.resurreccionName;
          power.releaseCommand =
            zan.releaseCommand || zan['release Command'] || power.releaseCommand;
          power.segundaEtapa = zan.segundaEtapa || power.segundaEtapa;
          power.aspectOfDeath = zan.aspectOfDeath || power.aspectOfDeath;
        } else if (raceLower.includes('fullbringer')) {
          power.fullbringName = zan.name || power.fullbringName;
          power.focusObject = zan.focusObject || power.focusObject;
          power.abilityDetail = zan.abilityDetail || power.abilityDetail;
        } else {
          power.customAbilities = JSON.stringify(zan);
        }
      } else if (typeof zan === 'string' && zan) {
        if (
          raceLower.includes('shinigami') ||
          raceLower.includes('visored') ||
          raceLower.includes('hybrid')
        ) {
          power.zanpakutoName = zan;
        } else if (raceLower.includes('quincy')) {
          power.spiritWeapon = zan;
        } else if (
          raceLower.includes('arrancar') ||
          raceLower.includes('espada') ||
          raceLower.includes('hollow')
        ) {
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

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `Seed complete: ${processedCharacters.length} characters inserted.`,
      );
    }
    process.exit(0);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Seeding failed:', error);
    }
    process.exit(1);
  }
};

if (require.main === module) {
  seedCharacters();
}
