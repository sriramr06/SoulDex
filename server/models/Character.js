const mongoose = require('mongoose');

const characterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    romajiName: String,
    englishName: String,
    japaneseName: String,

    race: { type: String, required: true, default: 'Unknown' },
    gender: { type: String, default: 'Unknown' },
    birthday: String,
    age: String,
    height: String,
    weight: String,
    blood_type: String,

    // Core identifiers
    number: Number, // Espada number
    rank: String,
    division: String,
    occupation: String,

    // Organization and processed power info (created by seeder/controllers)
    organization: {
      group: { type: String, default: '' },
      division: { type: String, default: '' },
      rank: { type: String, default: '' },
    },

    spiritualPower: {
      powerType: { type: String, default: '' },
      zanpakutoName: { type: String, default: '' },
      shikai: { type: String, default: '' },
      bankai: { type: String, default: '' },
      hollowMask: { type: String, default: '' },
      spiritWeapon: { type: String, default: '' },
      schrift: { type: String, default: '' },
      vollstandig: { type: String, default: '' },
      resurreccionName: { type: String, default: '' },
      releaseCommand: { type: String, default: '' },
      segundaEtapa: { type: String, default: '' },
      aspectOfDeath: { type: String, default: '' },
      fullbringName: { type: String, default: '' },
      focusObject: { type: String, default: '' },
      abilityDetail: { type: String, default: '' },
      customAbilities: { type: String, default: '' },
    },

    affiliation: { type: [String], default: [] },

    // Powers
    ability: String,
    spirit_weapon: String,
    vollstandig: String,

    zanpakuto: {
      name: String,
      releaseCommand: String,
      shikai: [String],
      bankai: [String],
    },

    resurrection: {
      // For Arrancar
      name: String,
      releaseCommand: String,
      segundaEtapa: String,
    },

    // Flexible fields
    description: String,
    img: {
      type: String,
      default:
        'https://res.cloudinary.com/dcsxejxia/image/upload/v1778496101/329b54d07444f009b0634f438db9a449_cpbmxi.jpg',
    },
    detailsImage: { type: String, default: '' },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    isOriginalCharacter: { type: Boolean, default: false },
    createdBy: { type: String, default: 'System' },

    // Social
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    likeCount: { type: Number, default: 0 },

    comments: [
      {
        text: { type: String, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userEmail: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    status: { type: String, default: 'Alive' },
  },
  { timestamps: true },
);

// Slug generation (improved)
function generateSlug(name) {
  return name
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

characterSchema.pre('save', async function (next) {
  if (this.isModified('name') || !this.slug) {
    let baseSlug = generateSlug(
      this.name || this.englishName || this.romajiName,
    );
    let newSlug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await mongoose.models.Character.findOne({
        slug: newSlug,
        _id: { $ne: this._id },
      });
      if (!existing) break;
      newSlug = `${baseSlug}-${counter++}`;
    }
    this.slug = newSlug;
  }
  next();
});

module.exports = mongoose.model('Character', characterSchema);
