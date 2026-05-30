const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

//@desc Register Users
//@route /api/register
//@access Public
const registerUser = async (req, res) => {
  const { email, password } = req.body;

  //Validation
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    //Check if user exists or not
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    //Hash Passowrd
    const salt = 12;
    const hashedPassword = await bcrypt.hash(password, salt);

    //Create user
    const newUser = await User.create({
      email: email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: 'User created successfully',
      userId: newUser._id,
    });
  } catch (error) {
    //Handle Validation Errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    //Handle Duplicate Error
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

//@desc Login Users
//@route /api/login
//@access Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    //Validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    //FindUser
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid Credentials' });
    }

    //Compare password and stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid Credentials' });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d',
      },
    );
    res.json({
      message: 'Login successful',
      token: token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('favorites')
      .populate('following', 'displayName username profilePicture race');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { displayName, bio, username, race } = req.body;
    if (displayName !== undefined) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;
    if (username !== undefined) user.username = username;
    if (race !== undefined) user.race = race;

    const cloudinary = require('../config/cloudinary');
    if (req.file) {
      const result = await cloudinary.uploadStream(
        req.file.buffer,
        'souldex/profiles',
      );
      user.profilePicture = result.secure_url;
    }

    await user.save();
    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('favorites');
    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const toggleFavorite = async (req, res) => {
  const { characterId } = req.params;
  const mongoose = require('mongoose');

  if (!mongoose.Types.ObjectId.isValid(characterId)) {
    return res.status(400).json({ message: 'Invalid Character ID' });
  }

  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const normalizedId = characterId.toString();
    const isFavorite = user.favorites.some(
      (favorite) => favorite.toString() === normalizedId,
    );

    if (isFavorite) {
      user.favorites = user.favorites.filter(
        (favorite) => favorite.toString() !== normalizedId,
      );
    } else {
      user.favorites.push(mongoose.Types.ObjectId(normalizedId));
    }

    await user.save();
    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('favorites');
    res.json({
      message: 'Favorites updated successfully',
      favorites: updatedUser.favorites,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const searchUsers = async (req, res) => {
  const { query } = req.query;
  try {
    if (!query) {
      return res.json([]);
    }
    const users = await User.find({
      $or: [
        { displayName: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
      ],
    })
      .select('_id displayName username profilePicture bio race')
      .limit(20);

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const toggleFollow = async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.userId;
  const mongoose = require('mongoose');

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  if (id === currentUserId) {
    return res.status(400).json({ message: 'You cannot follow yourself' });
  }

  try {
    const targetUser = await User.findById(id);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const normalizedId = id.toString();
    const isFollowing = currentUser.following.some(
      (followed) => followed.toString() === normalizedId,
    );

    if (isFollowing) {
      currentUser.following = currentUser.following.filter(
        (followed) => followed.toString() !== normalizedId,
      );
      targetUser.followers = targetUser.followers.filter(
        (follower) => follower.toString() !== currentUserId,
      );
    } else {
      currentUser.following.push(mongoose.Types.ObjectId(normalizedId));
      targetUser.followers.push(mongoose.Types.ObjectId(currentUserId));
    }

    await currentUser.save();
    await targetUser.save();

    res.json({
      message: isFollowing
        ? 'Unfollowed successfully'
        : 'Followed successfully',
      following: currentUser.following,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  toggleFavorite,
  searchUsers,
  toggleFollow,
};
