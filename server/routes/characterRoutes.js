const express = require('express');
const router = express.Router();
const {
  getCharacters,
  getCharactersById,
  likeCharacter,
  commentCharacter,
  createCharacter,
  updateCharacter,
  deleteCharacter
} = require('../controllers/charactersController');
const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.route('/')
  .get(getCharacters)
  .post(protect, upload.single('img'), createCharacter);

router.route('/:id')
  .get(getCharactersById)
  .put(protect, upload.single('img'), updateCharacter)
  .delete(protect, deleteCharacter);

router.route('/:id/like').post(protect, likeCharacter);
router.route('/:id/comment').post(protect, commentCharacter);

module.exports = router;