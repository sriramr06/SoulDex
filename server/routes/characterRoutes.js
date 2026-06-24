const express = require('express');
const router = express.Router();
const {
  getCharacters,
  getCharactersById,
  getUserCharacters,
  likeCharacter,
  commentCharacter,
  createCharacter,
  updateCharacter,
  deleteCharacter,
} = require('../controllers/charactersController');
const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const {
  validateCreateCharacter,
  validateUpdateCharacter,
  validateObjectId,
  validateUserId,
} = require('../middlewares/validators');

// User creations route
router.route('/user/:userId').get(validateUserId, getUserCharacters);

router
  .route('/')
  .get(getCharacters)
  .post(
    protect,
    upload.fields([
      { name: 'img', maxCount: 1 },
      { name: 'detailsImage', maxCount: 1 },
    ]),
    validateCreateCharacter,
    createCharacter,
  );

router
  .route('/:id')
  .get(validateObjectId, getCharactersById)
  .put(
    protect,
    upload.fields([
      { name: 'img', maxCount: 1 },
      { name: 'detailsImage', maxCount: 1 },
    ]),
    validateUpdateCharacter,
    updateCharacter,
  )
  .delete(protect, validateObjectId, deleteCharacter);

router.route('/:id/like').post(protect, validateObjectId, likeCharacter);

router.route('/:id/comment').post(protect, validateObjectId, commentCharacter);

module.exports = router;
