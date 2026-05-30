const Post = require('../models/Post');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');

const createPost = async (req, res) => {
  try {
    const { caption } = req.body;
    let imageUrl = '';

    if (req.file) {
      const result = await cloudinary.uploadStream(
        req.file.buffer,
        'souldex/posts',
      );
      imageUrl = result.secure_url;
    } else {
      return res.status(400).json({ message: 'Image is required for a post' });
    }

    const newPost = await Post.create({
      author: req.user.userId,
      imageUrl,
      caption,
    });

    const populatedPost = await Post.findById(newPost._id)
      .populate('author', 'displayName username profilePicture race')
      .populate('comments.user', 'displayName username profilePicture');

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getFeed = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 10),
    );
    const skip = (page - 1) * limit;

    const posts = await Post.find({ author: { $ne: req.user.userId } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'displayName username profilePicture race')
      .populate('comments.user', 'displayName username profilePicture');

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const mongoose = require('mongoose');

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const posts = await Post.find({ author: userId })
      .sort({ createdAt: -1 })
      .populate('author', 'displayName username profilePicture race')
      .populate('comments.user', 'displayName username profilePicture');

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const toggleLike = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { postId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const hasLiked = post.likes.some((id) => id.toString() === userId);
    if (hasLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();
    res.json({
      message: hasLiked ? 'Post unliked' : 'Post liked',
      likes: post.likes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const addComment = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const newComment = {
      user: userId,
      text: text.trim(),
    };

    post.comments.push(newComment);
    await post.save();

    const populatedPost = await Post.findById(postId)
      .populate('author', 'displayName username profilePicture race')
      .populate('comments.user', 'displayName username profilePicture');

    res.json(populatedPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  createPost,
  getFeed,
  getUserPosts,
  toggleLike,
  addComment,
};
