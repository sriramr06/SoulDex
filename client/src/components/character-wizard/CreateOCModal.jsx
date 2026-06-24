import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiRefreshCw, FiImage } from 'react-icons/fi';
import { createCharacter, updateCharacter } from '../../api/characters';
import styles from './CreateOCModal.module.css';

const TIER_1 = 1;
const TIER_2 = 2;
const TIER_3 = 3;

const defaultFormData = {
  name: '',
  romajiName: '',
  japaneseName: '',
  englishName: '',
  race: 'Shinigami',
  gender: 'Male',
  slug: '',
  birthday: '',
  age: '',
  height: '',
  weight: '',
  blood_type: '',
  occupation: '',
  description: '',
  // Powers & Abilities
  zanpakutoName: '',
  releaseCommand: '',
  shikai: '',
  bankai: '',
  spirit_weapon: '',
  schrift: '',
  vollstandig: '',
  resurreccionName: '',
  aspectOfDeath: '',
  segundaEtapa: '',
  hollowMask: '',
  fullbringName: '',
  focusObject: '',
  abilityDetail: '',
  // Organization
  number: '',
  group: '',
  division: '',
  rank: '',
};

const CreateOCModal = ({ onClose, onSuccess, existingCharacter = null }) => {
  const isEditMode = Boolean(existingCharacter);
  
  const [currentTier, setCurrentTier] = useState(TIER_1);
  const [formData, setFormData] = useState(() => {
    if (existingCharacter) {
      return {
        name: existingCharacter.name || '',
        romajiName: existingCharacter.romajiName || '',
        japaneseName: existingCharacter.japaneseName || '',
        englishName: existingCharacter.englishName || '',
        race: existingCharacter.race || 'Shinigami',
        gender: existingCharacter.gender || 'Male',
        slug: existingCharacter.slug || '',
        birthday: existingCharacter.birthday || '',
        age: existingCharacter.age || '',
        height: existingCharacter.height ? existingCharacter.height.replace(' cm', '').replace('cm', '') : '',
        weight: existingCharacter.weight ? existingCharacter.weight.replace(' kg', '').replace('kg', '') : '',
        blood_type: existingCharacter.blood_type || '',
        occupation: existingCharacter.occupation || '',
        description: existingCharacter.description || '',
        
        zanpakutoName: existingCharacter.spiritualPower?.zanpakutoName || '',
        releaseCommand: existingCharacter.spiritualPower?.releaseCommand || '',
        shikai: existingCharacter.spiritualPower?.shikai || '',
        bankai: existingCharacter.spiritualPower?.bankai || '',
        spirit_weapon: existingCharacter.spiritualPower?.spiritWeapon || existingCharacter.spiritualPower?.spirit_weapon || '',
        schrift: existingCharacter.spiritualPower?.schrift || '',
        vollstandig: existingCharacter.spiritualPower?.vollstandig || '',
        resurreccionName: existingCharacter.spiritualPower?.resurreccionName || existingCharacter.spiritualPower?.zanpakutoName || '',
        aspectOfDeath: existingCharacter.spiritualPower?.aspectOfDeath || '',
        segundaEtapa: existingCharacter.spiritualPower?.segundaEtapa || '',
        hollowMask: existingCharacter.spiritualPower?.hollowMask || '',
        fullbringName: existingCharacter.spiritualPower?.fullbringName || '',
        focusObject: existingCharacter.spiritualPower?.focusObject || '',
        abilityDetail: existingCharacter.spiritualPower?.abilityDetail || '',
        
        number: existingCharacter.number || '',
        group: existingCharacter.organization?.group || '',
        division: existingCharacter.organization?.division || '',
        rank: existingCharacter.organization?.rank || '',
      };
    }
    return defaultFormData;
  });

  const [imgFile, setImgFile] = useState(null);
  const [detailsImgFile, setDetailsImgFile] = useState(null);
  const [useSameImage, setUseSameImage] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEditMode) {
      const draft = localStorage.getItem('oc_draft');
      if (draft) {
        try {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setFormData(JSON.parse(draft));
        } catch (e) {
          console.error('Failed to parse draft', e);
        }
      }
    }
  }, [isEditMode]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveDraft = () => {
    if (isEditMode) return;
    localStorage.setItem('oc_draft', JSON.stringify(formData));
    alert('Draft saved to browser local storage.');
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all fields?')) {
      setFormData(defaultFormData);
      setImgFile(null);
      setDetailsImgFile(null);
      localStorage.removeItem('oc_draft');
      setCurrentTier(TIER_1);
    }
  };

  const nextTier = () => {
    if (currentTier === TIER_1 && !formData.name) {
      setError('Name is required.');
      return;
    }
    setError(null);
    setCurrentTier((prev) => Math.min(prev + 1, TIER_3));
  };

  const prevTier = () => {
    setCurrentTier((prev) => Math.max(prev - 1, TIER_1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === 'height' && formData.height) {
          data.append('height', isNaN(formData.height) ? formData.height : `${formData.height} cm`);
        } else if (key === 'weight' && formData.weight) {
          data.append('weight', isNaN(formData.weight) ? formData.weight : `${formData.weight} kg`);
        } else if (formData[key]) {
          data.append(key, formData[key]);
        }
      });

      if (imgFile) data.append('img', imgFile);

      if (useSameImage && imgFile) {
        data.append('detailsImage', imgFile);
      } else if (detailsImgFile) {
        data.append('detailsImage', detailsImgFile);
      }

      const org = {
        group: formData.group,
        division: formData.division,
        rank: formData.rank,
      };
      data.append('organization', JSON.stringify(org));

      let power = { powerType: formData.race };
      if (formData.race === 'Shinigami' || formData.race === 'Hybrid') {
        power = {
          ...power,
          zanpakutoName: formData.zanpakutoName,
          releaseCommand: formData.releaseCommand,
          shikai: formData.shikai,
          bankai: formData.bankai,
          abilityDetail: formData.abilityDetail,
        };
      } else if (formData.race === 'Visored') {
        power = {
          ...power,
          zanpakutoName: formData.zanpakutoName,
          releaseCommand: formData.releaseCommand,
          shikai: formData.shikai,
          bankai: formData.bankai,
          hollowMask: formData.hollowMask,
          abilityDetail: formData.abilityDetail,
        };
      } else if (formData.race === 'Quincy') {
        power = {
          ...power,
          spiritWeapon: formData.spirit_weapon,
          schrift: formData.schrift,
          vollstandig: formData.vollstandig,
          abilityDetail: formData.abilityDetail,
        };
      } else if (formData.race === 'Arrancar' || formData.race === 'Espada') {
        power = {
          ...power,
          resurreccionName: formData.resurreccionName,
          releaseCommand: formData.releaseCommand,
          segundaEtapa: formData.segundaEtapa,
          aspectOfDeath: formData.aspectOfDeath,
          abilityDetail: formData.abilityDetail,
        };
      } else if (formData.race === 'Fullbringer') {
        power = {
          ...power,
          fullbringName: formData.fullbringName,
          focusObject: formData.focusObject,
          abilityDetail: formData.abilityDetail,
        };
      }
      data.append('spiritualPower', JSON.stringify(power));

      if (isEditMode) {
        await updateCharacter(existingCharacter._id, data);
      } else {
        await createCharacter(data);
        localStorage.removeItem('oc_draft');
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create character');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTopStepper = () => {
    const tiers = [
      { id: TIER_1, label: 'Identity & Appearance' },
      { id: TIER_2, label: 'Spiritual Powers' },
      { id: TIER_3, label: 'Manifest Soul' },
    ];

    return (
      <div className={styles.topStepper}>
        <ul className={styles.tierList}>
          {tiers.map((t, idx) => (
            <React.Fragment key={t.id}>
              <li
                className={`${styles.tierItem} ${
                  currentTier === t.id ? styles.tierItemActive : ''
                } ${currentTier > t.id ? styles.tierItemCompleted : ''}`}
                onClick={() => {
                  if (currentTier > t.id || formData.name) setCurrentTier(t.id);
                }}
              >
                <span className={styles.stepDot}>{t.id}</span>
                <span className={styles.tierLabel}>{t.label}</span>
              </li>
              {idx < tiers.length - 1 && (
                <div className={styles.tierSeparator} />
              )}
            </React.Fragment>
          ))}
        </ul>
      </div>
    );
  };

  const renderTier1 = () => (
    <>
      <div className={styles.grid2}>
        <div className={styles.formGroup}>
          <label>Name *</label>
          <input
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g. Kurosaki Ichigo"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Romaji Name</label>
          <input
            name="romajiName"
            value={formData.romajiName}
            onChange={handleInputChange}
            placeholder="Optional"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Japanese Name</label>
          <input
            name="japaneseName"
            value={formData.japaneseName}
            onChange={handleInputChange}
            placeholder="Optional (e.g. 黒崎 一護)"
          />
        </div>
        <div className={styles.formGroup}>
          <label>English Name</label>
          <input
            name="englishName"
            value={formData.englishName}
            onChange={handleInputChange}
            placeholder="Optional"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Race</label>
          <select
            name="race"
            value={formData.race}
            onChange={handleInputChange}
          >
            <option value="Shinigami">Shinigami</option>
            <option value="Quincy">Quincy</option>
            <option value="Arrancar">Arrancar</option>
            <option value="Espada">Espada</option>
            <option value="Fullbringer">Fullbringer</option>
            <option value="Visored">Visored</option>
            <option value="Human">Human</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>Gender</label>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>Age</label>
          <input
            name="age"
            value={formData.age}
            onChange={handleInputChange}
            placeholder="e.g. 15 or 150+"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Birthday</label>
          <input
            name="birthday"
            value={formData.birthday}
            onChange={handleInputChange}
            placeholder="e.g. July 15"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Blood Type</label>
          <input
            name="blood_type"
            value={formData.blood_type}
            onChange={handleInputChange}
            placeholder="e.g. A, B, O, AB"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Height & Weight</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div className={styles.inputWithUnit}>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleInputChange}
                placeholder="174"
              />
              <span className={styles.unit}>cm</span>
            </div>
            <div className={styles.inputWithUnit}>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                placeholder="61"
              />
              <span className={styles.unit}>kg</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.formGroup} style={{ marginTop: '0.5rem' }}>
        <label>Character Bio / Description</label>
        <textarea
          name="description"
          rows="4"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Describe your character's backstory and personality..."
        />
      </div>
    </>
  );

  const renderTier2 = () => (
    <>
      <div className={styles.grid2}>
        <div className={styles.formGroup}>
          <label>Group / Affiliation</label>
          <input
            name="group"
            value={formData.group}
            onChange={handleInputChange}
            placeholder="e.g. Gotei 13, Wandenreich"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Division</label>
          <input
            name="division"
            value={formData.division}
            onChange={handleInputChange}
            placeholder="e.g. 6th Division"
          />
        </div>
        {formData.race !== 'Human' && (
          <div className={styles.formGroup}>
            <label>Rank</label>
            <input
              name="rank"
              value={formData.rank}
              onChange={handleInputChange}
              placeholder="e.g. Captain, Sternritter"
            />
          </div>
        )}
        {formData.race === 'Human' && (
          <div className={styles.formGroup}>
            <label>Occupation</label>
            <input
              name="occupation"
              value={formData.occupation}
              onChange={handleInputChange}
              placeholder="e.g. High School Student"
            />
          </div>
        )}
        {formData.race === 'Espada' && (
          <div className={styles.formGroup}>
            <label>Espada Number</label>
            <input
              type="number"
              name="number"
              value={formData.number}
              onChange={handleInputChange}
              placeholder="0-9"
            />
          </div>
        )}
      </div>

      <div
        style={{
          height: '1px',
          background: 'var(--border-light)',
          margin: '1.5rem 0',
          width: '100%',
        }}
      />

      {(formData.race === 'Shinigami' || formData.race === 'Visored') && (
        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label>Zanpakutō Name</label>
            <input
              name="zanpakutoName"
              value={formData.zanpakutoName}
              onChange={handleInputChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Release Command</label>
            <input
              name="releaseCommand"
              value={formData.releaseCommand}
              onChange={handleInputChange}
              placeholder="e.g. Scatter"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Shikai Name / Ability</label>
            <input
              name="shikai"
              value={formData.shikai}
              onChange={handleInputChange}
              placeholder="e.g. Tsubame"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Bankai Name / Ability</label>
            <input
              name="bankai"
              value={formData.bankai}
              onChange={handleInputChange}
              placeholder="e.g. Tsubame: Kogetsu"
            />
          </div>
          {formData.race === 'Visored' && (
            <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
              <label>Hollow Mask Ability</label>
              <input
                name="hollowMask"
                value={formData.hollowMask}
                onChange={handleInputChange}
                placeholder="Describe the hollow mask..."
              />
            </div>
          )}
          <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
            <label>General Abilities (Optional)</label>
            <textarea
              name="abilityDetail"
              rows="2"
              value={formData.abilityDetail}
              onChange={handleInputChange}
            />
          </div>
        </div>
      )}

      {formData.race === 'Quincy' && (
        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label>Spirit Weapon</label>
            <input
              name="spirit_weapon"
              value={formData.spirit_weapon}
              onChange={handleInputChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Schrift</label>
            <input
              name="schrift"
              value={formData.schrift}
              onChange={handleInputChange}
              placeholder="e.g. A - The Almighty"
            />
          </div>
          <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
            <label>Vollständig</label>
            <textarea
              name="vollstandig"
              rows="2"
              value={formData.vollstandig}
              onChange={handleInputChange}
            />
          </div>
          <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
            <label>General Abilities (Optional)</label>
            <textarea
              name="abilityDetail"
              rows="2"
              value={formData.abilityDetail}
              onChange={handleInputChange}
            />
          </div>
        </div>
      )}

      {(formData.race === 'Arrancar' || formData.race === 'Espada') && (
        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label>Resurrección Name</label>
            <input
              name="resurreccionName"
              value={formData.resurreccionName}
              onChange={handleInputChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Release Command</label>
            <input
              name="releaseCommand"
              value={formData.releaseCommand}
              onChange={handleInputChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Aspect of Death</label>
            <input
              name="aspectOfDeath"
              value={formData.aspectOfDeath}
              onChange={handleInputChange}
              placeholder="e.g. Solitude"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Segunda Etapa</label>
            <input
              name="segundaEtapa"
              value={formData.segundaEtapa}
              onChange={handleInputChange}
              placeholder="Optional second stage"
            />
          </div>
          <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
            <label>General Abilities (Optional)</label>
            <textarea
              name="abilityDetail"
              rows="2"
              value={formData.abilityDetail}
              onChange={handleInputChange}
            />
          </div>
        </div>
      )}

      {formData.race === 'Fullbringer' && (
        <div className={styles.grid2}>
          <div className={styles.formGroup}>
            <label>Fullbring Name</label>
            <input
              name="fullbringName"
              value={formData.fullbringName}
              onChange={handleInputChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Focus Object</label>
            <input
              name="focusObject"
              value={formData.focusObject}
              onChange={handleInputChange}
              placeholder="e.g. Cross, Necklace"
            />
          </div>
          <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
            <label>Ability Description</label>
            <textarea
              name="abilityDetail"
              rows="3"
              value={formData.abilityDetail}
              onChange={handleInputChange}
            />
          </div>
        </div>
      )}
    </>
  );

  const renderTier3 = () => (
    <div className={styles.reviewLayout}>
      <div className={styles.reviewSummary}>
        <h3 className={styles.reviewSectionTitle}>
          Identity & Appearance 
          <button className={styles.editBtn} onClick={() => setCurrentTier(TIER_1)}>Edit</button>
        </h3>
        <div className={styles.reviewGrid}>
           <div className={styles.reviewItem}><span>Name:</span> {formData.name || '-'}</div>
           <div className={styles.reviewItem}><span>Romaji:</span> {formData.romajiName || '-'}</div>
           <div className={styles.reviewItem}><span>Japanese:</span> {formData.japaneseName || '-'}</div>
           <div className={styles.reviewItem}><span>English:</span> {formData.englishName || '-'}</div>
           <div className={styles.reviewItem}><span>Race/Gender:</span> {formData.race} / {formData.gender}</div>
           <div className={styles.reviewItem}><span>Age:</span> {formData.age || '-'}</div>
           <div className={styles.reviewItem}><span>Birthday:</span> {formData.birthday || '-'}</div>
           <div className={styles.reviewItem}><span>Blood Type:</span> {formData.blood_type || '-'}</div>
           <div className={styles.reviewItem} style={{ gridColumn: 'span 2' }}>
             <span>Physical:</span> {formData.height ? `${formData.height} cm` : '-'} / {formData.weight ? `${formData.weight} kg` : '-'}
           </div>
        </div>

        <h3 className={styles.reviewSectionTitle}>
          Affiliation & Powers
          <button className={styles.editBtn} onClick={() => setCurrentTier(TIER_2)}>Edit</button>
        </h3>
        <div className={styles.reviewGrid}>
           <div className={styles.reviewItem}><span>Group:</span> {formData.group || '-'}</div>
           {formData.race !== 'Human' && <div className={styles.reviewItem}><span>Div/Rank:</span> {formData.division || '-'} / {formData.rank || '-'}</div>}
           {formData.race === 'Human' && <div className={styles.reviewItem}><span>Occupation:</span> {formData.occupation || '-'}</div>}
           {formData.race === 'Espada' && <div className={styles.reviewItem}><span>Espada Number:</span> {formData.number || '-'}</div>}
        </div>

        {(formData.race === 'Shinigami' || formData.race === 'Visored' || formData.race === 'Hybrid') && (
          <div className={styles.reviewGrid} style={{ marginTop: '0.5rem' }}>
             {formData.zanpakutoName && <div className={styles.reviewItem} style={{ gridColumn: 'span 2' }}><span>Zanpakutō:</span> {formData.zanpakutoName} ({formData.releaseCommand || 'No Command'})</div>}
             {formData.shikai && <div className={styles.reviewItem} style={{ gridColumn: 'span 2' }}><span>Shikai:</span> {formData.shikai}</div>}
             {formData.bankai && <div className={styles.reviewItem} style={{ gridColumn: 'span 2' }}><span>Bankai:</span> {formData.bankai}</div>}
             {formData.hollowMask && <div className={styles.reviewItem} style={{ gridColumn: 'span 2' }}><span>Hollow Mask:</span> {formData.hollowMask}</div>}
          </div>
        )}
        
        {formData.race === 'Quincy' && (
          <div className={styles.reviewGrid} style={{ marginTop: '0.5rem' }}>
             {formData.spirit_weapon && <div className={styles.reviewItem}><span>Weapon:</span> {formData.spirit_weapon}</div>}
             {formData.schrift && <div className={styles.reviewItem}><span>Schrift:</span> {formData.schrift}</div>}
             {formData.vollstandig && <div className={styles.reviewItem} style={{ gridColumn: 'span 2' }}><span>Vollständig:</span> {formData.vollstandig}</div>}
          </div>
        )}

        {(formData.race === 'Arrancar' || formData.race === 'Espada') && (
          <div className={styles.reviewGrid} style={{ marginTop: '0.5rem' }}>
             {formData.resurreccionName && <div className={styles.reviewItem} style={{ gridColumn: 'span 2' }}><span>Resurrección:</span> {formData.resurreccionName} ({formData.releaseCommand || 'No Command'})</div>}
             {formData.aspectOfDeath && <div className={styles.reviewItem}><span>Aspect:</span> {formData.aspectOfDeath}</div>}
             {formData.segundaEtapa && <div className={styles.reviewItem}><span>2nd Etapa:</span> {formData.segundaEtapa}</div>}
          </div>
        )}

        {formData.race === 'Fullbringer' && (
          <div className={styles.reviewGrid} style={{ marginTop: '0.5rem' }}>
             {formData.fullbringName && <div className={styles.reviewItem}><span>Fullbring:</span> {formData.fullbringName}</div>}
             {formData.focusObject && <div className={styles.reviewItem}><span>Focus:</span> {formData.focusObject}</div>}
          </div>
        )}

        {formData.abilityDetail && (
          <div className={styles.reviewGrid} style={{ marginTop: '0.5rem' }}>
             <div className={styles.reviewItem} style={{ gridColumn: 'span 2' }}><span>Abilities:</span> {formData.abilityDetail}</div>
          </div>
        )}
      </div>

      <div className={styles.reviewCardPreview}>
        <div className={styles.tradingCardWrapper}>
          <div className={styles.tradingCard}>
            <div className={styles.tcHeader}>
              {formData.race && (
                <div className={styles.tcRaceBadge}>{formData.race}</div>
              )}
              {imgFile ? (
                <img src={URL.createObjectURL(imgFile)} alt="Character Card" />
              ) : isEditMode && existingCharacter?.img ? (
                <img src={existingCharacter.img} alt="Character Card" />
              ) : (
                <span className={styles.tcHeaderEmpty}>No Image Uploaded</span>
              )}
            </div>
            <div className={styles.tcBody}>
              <h3 className={styles.tcName}>{formData.name || 'Unknown Soul'}</h3>
              <div className={styles.tcSubtitle}>
                {formData.race === 'Human' ? (formData.occupation || 'Unassigned') : (formData.rank || 'Unassigned')} •{' '}
                {formData.group || 'No Affiliation'}
              </div>

              <div className={styles.tcGrid}>
                <div className={styles.tcStat}>
                  <span className={styles.tcStatLabel}>Age / Gender</span>
                  <span className={styles.tcStatValue}>
                    {formData.age || '?'} / {formData.gender || '?'}
                  </span>
                </div>
                <div className={styles.tcStat}>
                  <span className={styles.tcStatLabel}>Physical</span>
                  <span className={styles.tcStatValue}>
                    {formData.height ? `${formData.height} cm` : '?'}{' '}
                    {formData.weight ? `• ${formData.weight} kg` : ''}
                  </span>
                </div>
                {formData.zanpakutoName && (
                  <div className={styles.tcStat} style={{ gridColumn: 'span 2' }}>
                    <span className={styles.tcStatLabel}>Primary Power</span>
                    <span className={styles.tcStatValue}>
                      {formData.zanpakutoName}{' '}
                      {formData.releaseCommand
                        ? `(${formData.releaseCommand})`
                        : ''}
                    </span>
                  </div>
                )}
                {formData.schrift && (
                  <div className={styles.tcStat} style={{ gridColumn: 'span 2' }}>
                    <span className={styles.tcStatLabel}>Schrift</span>
                    <span className={styles.tcStatValue}>{formData.schrift}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {isEditMode ? 'Reforging Soul' : 'SoulDex Forging'}
          </h2>
          <div className={styles.headerActions}>
            {!isEditMode && (
              <>
                <button
                  className={styles.btnDraft}
                  onClick={handleSaveDraft}
                  title="Save to local storage"
                >
                  <FiSave /> Draft
                </button>
                <button
                  className={styles.btnClear}
                  onClick={handleClear}
                  title="Refresh fields to default"
                >
                  <FiRefreshCw /> Reset
                </button>
              </>
            )}
            <button className={styles.btnClose} onClick={onClose} style={{ display: 'flex', color: 'var(--text-main)', opacity: 1, visibility: 'visible', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', lineHeight: 1, fontWeight: 300 }}>
              &times;
            </button>
          </div>
        </div>

        {renderTopStepper()}

        <div className={styles.modalBody}>
          {error && (
            <div
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid var(--status-error)',
                color: 'var(--text-primary)',
                padding: '1rem',
                marginBottom: '1rem',
                borderRadius: '6px',
                width: '100%',
              }}
            >
              {error}
            </div>
          )}

          {currentTier === TIER_1 ? (
            <div className={styles.formLayout}>
              <div>
                <div className={styles.uploadRow}>
                  <div className={styles.uploadGroup}>
                    <label className={styles.imagePlaceholder}>
                      {imgFile ? (
                        <img
                          src={URL.createObjectURL(imgFile)}
                          alt="Card preview"
                          className={styles.previewImage}
                        />
                      ) : isEditMode && existingCharacter?.img ? (
                        <img
                          src={existingCharacter.img}
                          alt="Card preview"
                          className={styles.previewImage}
                        />
                      ) : (
                        <FiImage size={24} />
                      )}
                      <span className={styles.imageLabel}>Card Image</span>
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => {
                          setImgFile(e.target.files[0]);
                        }}
                      />
                    </label>
                    <span className={styles.uploadSubtext}>1:1 Ratio</span>
                  </div>
                  <div className={styles.uploadGroup}>
                    <label className={styles.imagePlaceholder}>
                      {!useSameImage && detailsImgFile ? (
                        <img
                          src={URL.createObjectURL(detailsImgFile)}
                          alt="Details preview"
                          className={styles.previewImage}
                        />
                      ) : isEditMode && existingCharacter?.detailsImage ? (
                        <img
                          src={existingCharacter.detailsImage}
                          alt="Details preview"
                          className={styles.previewImage}
                        />
                      ) : (
                        <FiImage size={24} />
                      )}
                      <span className={styles.imageLabel}>Details Image</span>
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => {
                          setDetailsImgFile(e.target.files[0]);
                        }}
                        disabled={useSameImage}
                      />
                    </label>
                    <span className={styles.uploadSubtext}>9:16 Ratio</span>
                    <div className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        id="useSame"
                        checked={useSameImage}
                        onChange={(e) => {
                          setUseSameImage(e.target.checked);
                        }}
                      />
                      <label htmlFor="useSame">Same as Card</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.formContainer}>{renderTier1()}</div>
            </div>
          ) : (
            <div className={styles.formContainer}>
              {currentTier === TIER_2 ? renderTier2() : currentTier === TIER_3 ? renderTier3() : null}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            className={`${styles.btnNav} ${styles.btnBack}`}
            onClick={prevTier}
            disabled={isSubmitting || currentTier === TIER_1}
          >
            Back
          </button>
          {currentTier < TIER_3 && (
            <button
              className={`${styles.btnNav} ${styles.btnNext}`}
              onClick={nextTier}
            >
              Next Step
            </button>
          )}
          {currentTier === TIER_3 && (
            <button
              className={`${styles.btnNav} ${styles.btnSubmit}`}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Forging Soul...' : isEditMode ? 'Save Changes' : 'Manifest Character'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateOCModal;
