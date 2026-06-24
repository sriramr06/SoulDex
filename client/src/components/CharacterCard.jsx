import styles from './CharacterCard.module.css';

const CharacterCard = ({ character, action, ...props }) => {
  // Determine badge style based on race or group
  const raceLower = (character.race || '').toLowerCase();
  let badgeClass = styles.badge;
  if (raceLower.includes('quincy'))
    badgeClass = `${styles.badge} ${styles.badgeQuincy}`;
  else if (
    raceLower.includes('hollow') ||
    raceLower.includes('arrancar') ||
    raceLower.includes('espada')
  )
    badgeClass = `${styles.badge} ${styles.badgeHollow}`;
  else if (raceLower.includes('shinigami'))
    badgeClass = `${styles.badge} ${styles.badgeShinigami}`;
  else if (raceLower.includes('fullbringer'))
    badgeClass = `${styles.badge} ${styles.badgeFullbringer}`;
  else if (raceLower.includes('visored'))
    badgeClass = `${styles.badge} ${styles.badgeVisored}`;
  else if (raceLower.includes('human'))
    badgeClass = `${styles.badge} ${styles.badgeHuman}`;

  const badgeText =
    character.race || character.organization?.group || 'Unknown';

  // Format description to show rank
  let description =
    character.organization?.rank || character.occupation || 'Unknown Rank';

  return (
    <div
      className={styles.card}
      aria-label={`View ${character.name} details`}
      {...props}
    >
      <div className={styles.imageContainer}>
        {action && (
          <div
            className={styles.actionContainer}
            onClick={(e) => e.stopPropagation()}
          >
            {action}
          </div>
        )}
        <img
          src={
            character.img ||
            'https://res.cloudinary.com/dcsxejxia/image/upload/v1778496101/329b54d07444f009b0634f438db9a449_cpbmxi.jpg'
          }
          alt={character.name}
          className={styles.image}
          loading="lazy"
        />
        <div className={badgeClass}>{badgeText.toUpperCase()}</div>
      </div>

      <div className={styles.content}>
        <h3 className={styles.name}>{character.name}</h3>
        <div className={styles.descriptionRow}>
          <div className={styles.verticalBar}></div>
          <div className={styles.description}>{description}</div>
        </div>
      </div>
    </div>
  );
};

export default CharacterCard;
