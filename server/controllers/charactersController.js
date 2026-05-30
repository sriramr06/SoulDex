const mongoose = require('mongoose');
const Character = require('../models/Character');

const safeJsonParse = (str, fallback) => {
  if (typeof str === 'string') {
    try {
      return JSON.parse(str);
    } catch (e) {
      return fallback;
    }
  }
  return str !== undefined ? str : fallback;
};

//@desc     Get all characters (paginated)
//@route    GET /api/characters?page=1&limit=20&search=&filter=
//@access   Public
const getCharacters = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim() || '';
    const filter = req.query.filter || 'All';
    const rank = req.query.rank || 'All';
    const createdBy = req.query.createdBy?.trim() || '';

    // Build MongoDB query
    const query = {};

    if (search) {
      const s = { $regex: search, $options: 'i' };
      query.$or = [
        { name: s },
        { romajiName: s },
        { englishName: s },
        { japaneseName: s },
        { slug: s },
        { 'spiritualPower.zanpakutoName': s },
        { 'spiritualPower.resurreccionName': s },
        { 'organization.group': s },
        { 'organization.division': s },
      ];
    }

    if (createdBy) {
      query.createdBy = createdBy;
    }

    if (filter !== 'All') {
      const f = filter.toLowerCase();
      // Map common filter names to queries
      if (['shinigami', 'shinigamis'].includes(f))
        query.race = { $regex: 'shinigami', $options: 'i' };
      else if (['quincy', 'quincies'].includes(f))
        query.race = { $regex: 'quincy', $options: 'i' };
      else if (['hollow', 'hollows'].includes(f))
        query.race = { $regex: 'hollow', $options: 'i' };
      else if (
        [
          'arrancar',
          'arrancars',
          'espada',
          'espadas',
          'arrancar/espada',
        ].includes(f)
      )
        query.race = { $regex: 'arrancar|espada', $options: 'i' };
      else if (['royal guard', '0th division', 'squad zero'].includes(f))
        query['organization.group'] = {
          $regex: 'royal|0th|squad zero|royal guard',
          $options: 'i',
        };
      else if (['captain', 'captains'].includes(f))
        query['organization.rank'] = { $regex: 'captain', $options: 'i' };
      else if (['lieutenant', 'lieutenants'].includes(f))
        query['organization.rank'] = {
          $regex: '(lieutenant|vice-captain)',
          $options: 'i',
        };
      else if (f === 'former') {
        query.$or = [
          ...(query.$or || []),
          { 'organization.rank': { $regex: 'former', $options: 'i' } },
          { 'organization.division': { $regex: 'former', $options: 'i' } },
        ];
      } else {
        // allow arbitrary group/division filter matches
        query.$or = [
          ...(query.$or || []),
          { 'organization.group': { $regex: filter, $options: 'i' } },
          { 'organization.division': { $regex: filter, $options: 'i' } },
          { race: { $regex: filter, $options: 'i' } },
          { 'organization.rank': { $regex: filter, $options: 'i' } },
        ];
      }
    }

    if (rank !== 'All') {
      const r = rank.toLowerCase();
      if (['captain', 'captains'].includes(r))
        query['organization.rank'] = { $regex: 'captain', $options: 'i' };
      else if (['lieutenant', 'lieutenants'].includes(r))
        query['organization.rank'] = {
          $regex: '(lieutenant|vice-captain)',
          $options: 'i',
        };
      else if (['former', 'former members'].includes(r)) {
        query['organization.rank'] = { $regex: 'former', $options: 'i' };
      } else if (['member', 'members'].includes(r)) {
        // Find ranks that are unseated or general members (not captains or lieutenants)
        query['organization.rank'] = {
          $not: { $regex: 'captain|lieutenant|vice-captain', $options: 'i' },
        };
      } else {
        query.$or = [
          ...(query.$or || []),
          { 'organization.group': { $regex: rank, $options: 'i' } },
          { 'organization.division': { $regex: rank, $options: 'i' } },
          { 'organization.rank': { $regex: rank, $options: 'i' } },
          { race: { $regex: rank, $options: 'i' } },
        ];
      }
    }

    const [characters, totalCount] = await Promise.all([
      Character.find(query).sort({ name: 1 }).skip(skip).limit(limit),
      Character.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    res.status(200).json({
      success: true,
      count: characters.length,
      totalCount,
      totalPages,
      currentPage: page,
      hasMore,
      characters,
    });
  } catch (error) {
    console.error('getCharacters error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

//@desc     Get character by id
//@route    /api/characters/:id
//@access   Public
const getCharactersById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid Character ID' });
    }

    const character = await Character.findById(req.params.id);
    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }
    res.json({ success: true, character });
  } catch (error) {
    console.error('getCharactersById error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

//@desc     Like / Unlike a character
//@route    POST /api/characters/:id/like
//@access   Public (Authenticated)
const likeCharacter = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid Character ID' });
    }

    const character = await Character.findById(req.params.id);
    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    const userId = req.user.userId;
    const hasLiked = character.likes.some((id) => id.toString() === userId);

    if (hasLiked) {
      character.likes = character.likes.filter(
        (id) => id.toString() !== userId,
      );
    } else {
      character.likes.push(userId);
    }

    character.likeCount = character.likes.length;
    await character.save();

    // Emit socket update
    const io = req.app.get('io');
    if (io) {
      io.emit('characterUpdated', {
        characterId: character._id,
        likes: character.likes,
        comments: character.comments,
      });
    }

    res
      .status(200)
      .json({
        success: true,
        likes: character.likes,
        likeCount: character.likeCount,
      });
  } catch (error) {
    console.error('likeCharacter error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

//@desc     Add a comment to a character
//@route    POST /api/characters/:id/comment
//@access   Private
const commentCharacter = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid Character ID' });
    }

    const { text } = req.body;
    const userEmail = req.user.email;
    const userId = req.user.userId;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const character = await Character.findById(req.params.id);
    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    const newComment = {
      text: text.trim(),
      userId,
      userEmail,
      createdAt: new Date(),
    };

    character.comments.push(newComment);
    await character.save();

    // Emit socket update
    const io = req.app.get('io');
    if (io) {
      io.emit('characterUpdated', {
        characterId: character._id,
        likes: character.likes,
        comments: character.comments,
      });
    }

    res.status(201).json({ success: true, comments: character.comments });
  } catch (error) {
    console.error('commentCharacter error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const createCharacter = async (req, res) => {
  try {
    const {
      name,
      romajiName,
      englishName,
      japaneseName,
      race,
      birthday,
      age,
      gender,
      height,
      weight,
      affiliation,
      division,
      rank,
      number,
      occupation,
      blood_type,
      spirit_weapon,
      vollstandig,
      ability,
      group,
      status,
      zanpakuto,
      organization,
      spiritualPower,
      description,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    // Slug uniqueness is now handled by the Character model pre‑save hook.

    let imgUrl = undefined;
    if (req.file) {
      const cloudinary = require('../config/cloudinary');
      const uploadRes = await cloudinary.uploadStream(
        req.file.buffer,
        'souldex/characters',
      );
      imgUrl = uploadRes.secure_url;
    }

    // Parse organization
    let parsedOrganization = safeJsonParse(organization, {
      group: group || '',
      division: division || '',
      rank: rank || '',
    });

    // Parse spiritualPower
    let parsedSpiritualPower = safeJsonParse(spiritualPower, null);
    if (!parsedSpiritualPower) {
      if (zanpakuto) {
        const parsedZan = safeJsonParse(zanpakuto, zanpakuto);
        if (parsedZan) {
          if (typeof parsedZan === 'string') {
            parsedSpiritualPower = {
              powerType: race || 'Unknown',
              zanpakutoName: parsedZan,
            };
          } else {
            parsedSpiritualPower = {
              powerType: race || 'Unknown',
              zanpakutoName: parsedZan.name || '',
              shikai: parsedZan.shikai || '',
              bankai: parsedZan.bankai || '',
            };
          }
        }
      } else {
        parsedSpiritualPower = {
          powerType: race || 'Unknown',
        };
      }
    }

    let parsedAffiliation = safeJsonParse(affiliation, []);

    const character = new Character({
      name,
      romajiName: romajiName || name,
      englishName,
      japaneseName,
      race: race || 'Unknown',
      birthday,
      age,
      gender: gender || 'Unknown',
      height,
      weight,
      affiliation: parsedAffiliation,
      organization: parsedOrganization,
      spiritualPower: parsedSpiritualPower,
      status: status || 'Unknown',
      description,
      isOriginalCharacter: true,
      createdBy: req.user.email,
      img: imgUrl,
    });

    await character.save();
    res.status(201).json({ success: true, character });
  } catch (error) {
    console.error('Create character error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

//@desc     Update character details
//@route    PUT /api/characters/:id
//@access   Private
const updateCharacter = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid Character ID' });
    }

    const character = await Character.findById(req.params.id);
    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Check authorization: only creator or admin
    if (character.createdBy !== req.user.email && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ message: 'Not authorized to modify this character' });
    }

    const {
      name,
      romajiName,
      englishName,
      japaneseName,
      race,
      birthday,
      age,
      gender,
      height,
      weight,
      affiliation,
      division,
      rank,
      status,
      zanpakuto,
      organization,
      spiritualPower,
      description,
    } = req.body;

    if (name) {
      character.name = name;
      // Slug is generated automatically by the Character model's pre‑save hook.
    }
    if (romajiName !== undefined) character.romajiName = romajiName;
    if (englishName !== undefined) character.englishName = englishName;
    if (japaneseName !== undefined) character.japaneseName = japaneseName;
    if (race !== undefined) character.race = race;
    if (birthday !== undefined) character.birthday = birthday;
    if (age !== undefined) character.age = age;
    if (gender !== undefined) character.gender = gender;
    if (height !== undefined) character.height = height;
    if (weight !== undefined) character.weight = weight;
    if (status !== undefined) character.status = status;
    if (description !== undefined) character.description = description;

    // Handle organization update
    if (organization !== undefined) {
      character.organization = safeJsonParse(
        organization,
        character.organization,
      );
    } else {
      // Fallback/Update individual fields if sent
      if (!character.organization) character.organization = {};
      if (req.body.group !== undefined)
        character.organization.group = req.body.group;
      if (division !== undefined) character.organization.division = division;
      if (rank !== undefined) character.organization.rank = rank;
    }

    // Handle spiritualPower update
    if (spiritualPower !== undefined) {
      character.spiritualPower = safeJsonParse(
        spiritualPower,
        character.spiritualPower,
      );
    } else if (zanpakuto !== undefined) {
      const parsedZan = safeJsonParse(zanpakuto, zanpakuto);
      if (parsedZan) {
        if (typeof parsedZan === 'string') {
          character.spiritualPower = {
            powerType: race || character.race || 'Unknown',
            zanpakutoName: parsedZan,
          };
        } else {
          character.spiritualPower = {
            powerType: race || character.race || 'Unknown',
            zanpakutoName: parsedZan.name || '',
            shikai: parsedZan.shikai || '',
            bankai: parsedZan.bankai || '',
          };
        }
      }
    }

    if (affiliation !== undefined) {
      character.affiliation = safeJsonParse(affiliation, character.affiliation);
    }

    if (req.file) {
      const cloudinary = require('../config/cloudinary');
      const uploadRes = await cloudinary.uploadStream(
        req.file.buffer,
        'souldex/characters',
      );
      character.img = uploadRes.secure_url;
    }

    await character.save();

    // Emit socket update
    const io = req.app.get('io');
    if (io) {
      io.emit('characterUpdated', {
        characterId: character._id,
        likes: character.likes,
        comments: character.comments,
      });
    }

    res.status(200).json({ success: true, character });
  } catch (error) {
    console.error('Update character error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

//@desc     Delete a character
//@route    DELETE /api/characters/:id
//@access   Private
const deleteCharacter = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid Character ID' });
    }

    const character = await Character.findById(req.params.id);
    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Check authorization: only creator or admin
    if (character.createdBy !== req.user.email && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ message: 'Not authorized to delete this character' });
    }

    await Character.findByIdAndDelete(req.params.id);

    // Emit update event to clients so they remove it from list
    const io = req.app.get('io');
    if (io) {
      io.emit('characterDeleted', { characterId: req.params.id });
    }

    res
      .status(200)
      .json({ success: true, message: 'Character removed successfully' });
  } catch (error) {
    console.error('Delete character error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getCharacters,
  getCharactersById,
  likeCharacter,
  commentCharacter,
  createCharacter,
  updateCharacter,
  deleteCharacter,
};
