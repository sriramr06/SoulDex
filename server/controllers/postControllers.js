const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const cloudinary = require('../config/cloudinary');
const { sanitizeText } = require('../utils/sanitizer');

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
      caption: sanitizeText(caption),
    });

    const populatedPost = await Post.findById(newPost._id)
      .populate('author', 'displayName username profilePicture race')
      .populate('comments.user', 'displayName username profilePicture');

    res.status(201).json(populatedPost);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
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
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
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
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
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

    if (!hasLiked && post.author.toString() !== userId) {
      await Notification.create({
        recipient: post.author,
        sender: userId,
        type: 'LIKE_POST',
        relatedId: post._id,
        relatedModel: 'Post',
      });
    }
    res.json({
      message: hasLiked ? 'Post unliked' : 'Post liked',
      likes: post.likes,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
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
      text: sanitizeText(text),
    };

    post.comments.push(newComment);
    await post.save();

    if (post.author.toString() !== userId) {
      await Notification.create({
        recipient: post.author,
        sender: userId,
        type: 'COMMENT_POST',
        relatedId: post._id,
        relatedModel: 'Post',
        message: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      });
    }

    const populatedPost = await Post.findById(postId)
      .populate('author', 'displayName username profilePicture race')
      .populate('comments.user', 'displayName username profilePicture');

    res.json(populatedPost);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

const deleteComment = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { postId, commentId } = req.params;
    const userId = req.user.userId;

    if (
      !mongoose.Types.ObjectId.isValid(postId) ||
      !mongoose.Types.ObjectId.isValid(commentId)
    ) {
      return res.status(400).json({ message: 'Invalid post or comment ID' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const isCommentOwner = comment.user.toString() === userId;
    const isPostOwner = post.author.toString() === userId;

    if (!isCommentOwner && !isPostOwner) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    comment.remove();
    await post.save();

    const populatedPost = await Post.findById(postId)
      .populate('author', 'displayName username profilePicture race')
      .populate('comments.user', 'displayName username profilePicture');

    res.json(populatedPost);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

const deletePost = async (req, res) => {
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

    if (post.author.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await post.remove();
    res.json({ message: 'Post deleted successfully', postId });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

const updatePost = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { postId } = req.params;
    const { caption } = req.body;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this post' });
    }

    post.caption = sanitizeText(caption);
    await post.save();

    const populatedPost = await Post.findById(postId)
      .populate('author', 'displayName username profilePicture race')
      .populate('comments.user', 'displayName username profilePicture');

    res.json(populatedPost);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  createPost,
  getFeed,
  getUserPosts,
  toggleLike,
  addComment,
  deleteComment,
  deletePost,
  updatePost,
};
