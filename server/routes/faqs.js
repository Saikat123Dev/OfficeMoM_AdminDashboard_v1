const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');
const router = express.Router();

const toTinyIntBoolean = (value, defaultValue = 1) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true') return 1;
    if (lower === 'false') return 0;
  }
  const num = Number(value);
  if (Number.isNaN(num)) return defaultValue;
  return num === 0 ? 0 : 1;
};

const normalizeFaqPayload = (body = {}, { forUpdate = false } = {}) => {
  const question = (body.question || '').trim();
  const answer = (body.answer || '').trim();
  const category = (body.category || '').trim();
  const need_for = (body.need_for || 'mainPage').trim() || 'mainPage';
  const display_order = Number.isFinite(Number(body.display_order)) ? Number(body.display_order) : 0;
  const is_active = toTinyIntBoolean(body.is_active, 1);

  if (!forUpdate || body.question !== undefined) {
    if (!question) return { error: 'Question is required' };
  }
  if (!forUpdate || body.answer !== undefined) {
    if (!answer) return { error: 'Answer is required' };
  }
  if (!forUpdate || body.category !== undefined) {
    if (!category) return { error: 'Category is required' };
  }

  return {
    question,
    answer,
    category,
    need_for,
    display_order,
    is_active
  };
};

const normalizeKeywordList = (value) => {
  if (value === undefined || value === null || value === '') return [];

  if (Array.isArray(value)) {
    return value
      .map(item => String(item || '').trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map(item => String(item || '').trim())
          .filter(Boolean);
      }
      if (typeof parsed === 'string' && parsed.trim()) {
        return [parsed.trim()];
      }
    } catch (error) {
      // Fall back to comma-separated parsing for plain text input.
    }

    const commaSeparated = trimmed
      .replace(/^\[/, '')
      .replace(/\]$/, '')
      .split(',')
      .map(item => item.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);

    if (commaSeparated.length > 0) return commaSeparated;
    return [trimmed];
  }

  const asString = String(value).trim();
  return asString ? [asString] : [];
};

const normalizeKeywordsForStorage = (value) => JSON.stringify(normalizeKeywordList(value));

const parseKeywordsFromStorage = (value) => normalizeKeywordList(value);

const normalizePlanListForStorage = (value) => JSON.stringify(normalizeKeywordList(value));

const parsePlanListFromStorage = (value) => normalizeKeywordList(value);

const mapOfficemomDetail = (row) => ({
  ...row,
  keywords: parseKeywordsFromStorage(row.keywords)
});

const normalizeOfficemomDetailPayload = (body = {}) => {
  const rawDetailType = body.detail_type !== undefined ? body.detail_type : body.detailType;
  const rawDisplayOrder = body.display_order !== undefined ? body.display_order : body.displayOrder;
  const rawIsActive = body.is_active !== undefined ? body.is_active : body.isActive;
  const detail_type = String(rawDetailType || '').trim();
  const title = (body.title || '').trim();
  const content = (body.content || '').trim();
  const category = (body.category || 'general').trim() || 'general';
  const display_order = Number.isFinite(Number(rawDisplayOrder)) ? Number(rawDisplayOrder) : 0;
  const is_active = toTinyIntBoolean(rawIsActive, 1);
  const keywords = normalizeKeywordsForStorage(body.keywords);

  if (!detail_type) return { error: 'Detail type is required' };
  if (!title) return { error: 'Title is required' };
  if (!content) return { error: 'Content is required' };

  return {
    detail_type,
    title,
    content,
    keywords,
    category,
    display_order,
    is_active
  };
};

const mapFeature = (row) => ({
  ...row,
  keywords: parseKeywordsFromStorage(row.keywords),
  available_in_plans: parsePlanListFromStorage(row.available_in_plans)
});

const normalizeFeaturePayload = (body = {}) => {
  const rawFeatureName = body.feature_name !== undefined ? body.feature_name : body.featureName;
  const rawFeatureCategory = body.feature_category !== undefined ? body.feature_category : body.featureCategory;
  const rawShortDescription = body.short_description !== undefined ? body.short_description : body.shortDescription;
  const rawDetailedDescription = body.detailed_description !== undefined ? body.detailed_description : body.detailedDescription;
  const rawAvailableInPlans = body.available_in_plans !== undefined ? body.available_in_plans : body.availableInPlans;
  const rawIconName = body.icon_name !== undefined ? body.icon_name : body.iconName;
  const rawDisplayOrder = body.display_order !== undefined ? body.display_order : body.displayOrder;
  const rawIsActive = body.is_active !== undefined ? body.is_active : body.isActive;

  const feature_name = String(rawFeatureName || '').trim();
  const feature_category = String(rawFeatureCategory || '').trim();
  const short_description = String(rawShortDescription || '').trim();
  const detailed_description = String(rawDetailedDescription || '').trim();
  const keywords = normalizeKeywordsForStorage(body.keywords);
  const available_in_plans = normalizePlanListForStorage(rawAvailableInPlans);
  const icon_name = String(rawIconName || '').trim();
  const display_order = Number.isFinite(Number(rawDisplayOrder)) ? Number(rawDisplayOrder) : 0;
  const is_active = toTinyIntBoolean(rawIsActive, 1);

  if (!feature_name) return { error: 'Feature name is required' };
  if (!feature_category) return { error: 'Feature category is required' };
  if (!icon_name) return { error: 'Icon name is required' };
  if (!short_description) return { error: 'Short description is required' };
  if (!detailed_description) return { error: 'Detailed description is required' };

  return {
    feature_name,
    feature_category,
    short_description,
    detailed_description,
    keywords,
    available_in_plans,
    icon_name,
    display_order,
    is_active
  };
};

const DEFAULT_RECHARGE_PACKAGES = [
  {
    package_name: 'Recharge_500',
    display_name: '500 Minutes Top-up',
    description: '',
    stripe_price_id: '',
    minutes: 500,
    price: 5,
    currency: 'usd',
    features: ['500 minutes'],
    is_active: 1,
    is_popular: 0,
    sort_order: 1
  },
  {
    package_name: 'Recharge_1000',
    display_name: '1,000 Minutes Top-up',
    description: '',
    stripe_price_id: '',
    minutes: 1000,
    price: 10,
    currency: 'usd',
    features: ['1,000 minutes'],
    is_active: 1,
    is_popular: 0,
    sort_order: 2
  },
  {
    package_name: 'Recharge_2000',
    display_name: '2,000 Minutes Top-up',
    description: '',
    stripe_price_id: '',
    minutes: 2000,
    price: 20,
    currency: 'usd',
    features: ['2,000 minutes'],
    is_active: 1,
    is_popular: 0,
    sort_order: 3
  },
  {
    package_name: 'Recharge_5000',
    display_name: '5,000 Minutes Top-up',
    description: '',
    stripe_price_id: '',
    minutes: 5000,
    price: 50,
    currency: 'usd',
    features: ['5,000 minutes'],
    is_active: 1,
    is_popular: 0,
    sort_order: 4
  }
];

const mapRechargePackage = (row) => ({
  ...row,
  features: parseKeywordsFromStorage(row.features)
});

const normalizeRechargePackagePayload = (body = {}) => {
  const rawPackageName = body.package_name !== undefined ? body.package_name : body.packageName;
  const rawDisplayName = body.display_name !== undefined ? body.display_name : body.displayName;
  const rawStripePriceId = body.stripe_price_id !== undefined ? body.stripe_price_id : body.stripePriceId;
  const rawSortOrder = body.sort_order !== undefined ? body.sort_order : body.sortOrder;
  const rawIsActive = body.is_active !== undefined ? body.is_active : body.isActive;
  const rawIsPopular = body.is_popular !== undefined ? body.is_popular : body.isPopular;

  const package_name = String(rawPackageName || '').trim();
  const display_name = String(rawDisplayName || '').trim();
  const description = String(body.description || '').trim();
  const stripe_price_id = String(rawStripePriceId || '').trim();
  const minutes = Number(body.minutes);
  const price = Number(body.price);
  const currency = String(body.currency || 'usd').trim().toLowerCase() || 'usd';
  const features = normalizeKeywordsForStorage(body.features);
  const is_active = toTinyIntBoolean(rawIsActive, 1);
  const is_popular = toTinyIntBoolean(rawIsPopular, 0);
  const sort_order = Number.isFinite(Number(rawSortOrder)) ? Number(rawSortOrder) : 0;

  if (!package_name) return { error: 'Package name is required' };
  if (!display_name) return { error: 'Display name is required' };
  if (!Number.isFinite(minutes) || minutes <= 0) return { error: 'Minutes must be greater than 0' };
  if (!Number.isFinite(price) || price < 0) return { error: 'Price must be a positive number' };
  if (!currency) return { error: 'Currency is required' };

  return {
    package_name,
    display_name,
    description,
    stripe_price_id,
    minutes,
    price,
    currency,
    features,
    is_active,
    is_popular,
    sort_order
  };
};

const ensureDefaultRechargePackages = async () => {
  const [existingRows] = await pool.execute(
    `SELECT package_name
     FROM recharge_packages
     WHERE package_name IS NOT NULL AND package_name != ''`
  );

  const existingNames = new Set(
    existingRows
      .map((row) => String(row.package_name || '').trim().toLowerCase())
      .filter(Boolean)
  );

  const missingDefaults = DEFAULT_RECHARGE_PACKAGES.filter(
    (pkg) => !existingNames.has(pkg.package_name.toLowerCase())
  );

  if (missingDefaults.length === 0) return;

  for (const pkg of missingDefaults) {
    await pool.execute(
      `INSERT INTO recharge_packages (
        package_name, display_name, description, stripe_price_id,
        minutes, price, currency, features, is_active, is_popular, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pkg.package_name,
        pkg.display_name,
        pkg.description,
        pkg.stripe_price_id,
        pkg.minutes,
        pkg.price,
        pkg.currency,
        JSON.stringify(pkg.features),
        pkg.is_active,
        pkg.is_popular,
        pkg.sort_order
      ]
    );
  }
};

const mapIntentKeyword = (row) => ({
  ...row,
  keywords: parseKeywordsFromStorage(row.keywords)
});

const normalizeIntentKeywordPayload = (body = {}) => {
  const rawIntentName = body.intent_name !== undefined ? body.intent_name : body.intentName;
  const rawPriority = body.priority;
  const rawIsActive = body.is_active !== undefined ? body.is_active : body.isActive;

  const intent_name = String(rawIntentName || '').trim();
  const keywordsList = normalizeKeywordList(body.keywords);
  const keywords = JSON.stringify(keywordsList);
  const priority = Number.isFinite(Number(rawPriority)) ? Number(rawPriority) : 0;
  const is_active = toTinyIntBoolean(rawIsActive, 1);

  if (!intent_name) return { error: 'Intent name is required' };
  if (keywordsList.length === 0) return { error: 'At least one keyword is required' };

  return {
    intent_name,
    keywords,
    priority,
    is_active
  };
};

// Get OfficeMoM details options (detail_type and category)
router.get('/details/options', authenticateToken, async (req, res) => {
  try {
    const [detailTypes] = await pool.execute(
      `SELECT DISTINCT detail_type
       FROM officemom_details
       WHERE detail_type IS NOT NULL AND detail_type != ''
       ORDER BY detail_type ASC`
    );
    const [categories] = await pool.execute(
      `SELECT DISTINCT category
       FROM officemom_details
       WHERE category IS NOT NULL AND category != ''
       ORDER BY category ASC`
    );

    res.json({
      success: true,
      detail_types: detailTypes.map(row => row.detail_type),
      categories: categories.map(row => row.category)
    });
  } catch (error) {
    console.error('Error fetching OfficeMoM detail options:', error);
    res.status(500).json({ success: false, error: 'Failed to load details options' });
  }
});

// Get all OfficeMoM details
router.get('/details', authenticateToken, async (req, res) => {
  try {
    const { detail_type, category, search = '', is_active } = req.query;

    let query = `
      SELECT id, detail_type, title, content, keywords, category,
             display_order, is_active, created_at, updated_at
      FROM officemom_details
      WHERE 1=1
    `;
    const params = [];

    if (detail_type) {
      query += ` AND detail_type = ?`;
      params.push(detail_type);
    }

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (is_active !== undefined) {
      query += ` AND is_active = ?`;
      params.push(toTinyIntBoolean(is_active, 1));
    }

    if (search) {
      query += ` AND (title LIKE ? OR content LIKE ? OR keywords LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY display_order ASC, created_at DESC`;

    const [rows] = await pool.execute(query, params);
    res.json({
      success: true,
      details: rows.map(mapOfficemomDetail)
    });
  } catch (error) {
    console.error('Error fetching OfficeMoM details:', error);
    res.status(500).json({ success: false, error: 'Failed to load details' });
  }
});

// Get a single OfficeMoM detail by id
router.get('/details/:id', authenticateToken, async (req, res) => {
  try {
    const detailId = Number(req.params.id);
    if (!detailId || Number.isNaN(detailId)) {
      return res.status(400).json({ success: false, error: 'Invalid detail id' });
    }

    const [rows] = await pool.execute(
      `SELECT id, detail_type, title, content, keywords, category,
              display_order, is_active, created_at, updated_at
       FROM officemom_details
       WHERE id = ?`,
      [detailId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Detail not found' });
    }

    res.json({
      success: true,
      detail: mapOfficemomDetail(rows[0])
    });
  } catch (error) {
    console.error('Error fetching OfficeMoM detail:', error);
    res.status(500).json({ success: false, error: 'Failed to load detail' });
  }
});

// Create OfficeMoM detail
router.post('/details', authenticateToken, async (req, res) => {
  try {
    const payload = normalizeOfficemomDetailPayload(req.body);
    if (payload.error) {
      return res.status(400).json({ success: false, error: payload.error });
    }

    const [result] = await pool.execute(
      `INSERT INTO officemom_details (
        detail_type, title, content, keywords, category, display_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.detail_type,
        payload.title,
        payload.content,
        payload.keywords,
        payload.category,
        payload.display_order,
        payload.is_active
      ]
    );

    const [createdRows] = await pool.execute(
      `SELECT id, detail_type, title, content, keywords, category,
              display_order, is_active, created_at, updated_at
       FROM officemom_details
       WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Detail created successfully',
      detail: mapOfficemomDetail(createdRows[0])
    });
  } catch (error) {
    console.error('Error creating OfficeMoM detail:', error);
    res.status(500).json({ success: false, error: 'Failed to create detail' });
  }
});

// Update OfficeMoM detail
router.put('/details/:id', authenticateToken, async (req, res) => {
  try {
    const detailId = Number(req.params.id);
    if (!detailId || Number.isNaN(detailId)) {
      return res.status(400).json({ success: false, error: 'Invalid detail id' });
    }

    const payload = normalizeOfficemomDetailPayload(req.body);
    if (payload.error) {
      return res.status(400).json({ success: false, error: payload.error });
    }

    const [result] = await pool.execute(
      `UPDATE officemom_details
       SET detail_type = ?, title = ?, content = ?, keywords = ?, category = ?,
           display_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        payload.detail_type,
        payload.title,
        payload.content,
        payload.keywords,
        payload.category,
        payload.display_order,
        payload.is_active,
        detailId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Detail not found' });
    }

    const [updatedRows] = await pool.execute(
      `SELECT id, detail_type, title, content, keywords, category,
              display_order, is_active, created_at, updated_at
       FROM officemom_details
       WHERE id = ?`,
      [detailId]
    );

    res.json({
      success: true,
      message: 'Detail updated successfully',
      detail: mapOfficemomDetail(updatedRows[0])
    });
  } catch (error) {
    console.error('Error updating OfficeMoM detail:', error);
    res.status(500).json({ success: false, error: 'Failed to update detail' });
  }
});

// Delete OfficeMoM detail
router.delete('/details/:id', authenticateToken, async (req, res) => {
  try {
    const detailId = Number(req.params.id);
    if (!detailId || Number.isNaN(detailId)) {
      return res.status(400).json({ success: false, error: 'Invalid detail id' });
    }

    const [result] = await pool.execute(
      `DELETE FROM officemom_details WHERE id = ?`,
      [detailId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Detail not found' });
    }

    res.json({ success: true, message: 'Detail deleted successfully' });
  } catch (error) {
    console.error('Error deleting OfficeMoM detail:', error);
    res.status(500).json({ success: false, error: 'Failed to delete detail' });
  }
});

// Get feature options (categories, icons, available plans)
router.get('/features/options', authenticateToken, async (req, res) => {
  try {
    const [categories] = await pool.execute(
      `SELECT DISTINCT feature_category
       FROM features
       WHERE feature_category IS NOT NULL AND feature_category != ''
       ORDER BY feature_category ASC`
    );
    const [icons] = await pool.execute(
      `SELECT DISTINCT icon_name
       FROM features
       WHERE icon_name IS NOT NULL AND icon_name != ''
       ORDER BY icon_name ASC`
    );
    const [planRows] = await pool.execute(
      `SELECT available_in_plans
       FROM features
       WHERE available_in_plans IS NOT NULL AND available_in_plans != ''`
    );

    const availablePlans = [...new Set(
      planRows.flatMap((row) => parsePlanListFromStorage(row.available_in_plans))
    )].sort((a, b) => a.localeCompare(b));

    res.json({
      success: true,
      feature_categories: categories.map((row) => row.feature_category),
      icon_names: icons.map((row) => row.icon_name),
      available_plans: availablePlans
    });
  } catch (error) {
    console.error('Error fetching feature options:', error);
    res.status(500).json({ success: false, error: 'Failed to load feature options' });
  }
});

// Get all features
router.get('/features', authenticateToken, async (req, res) => {
  try {
    const { feature_category, search = '', is_active, available_in_plan } = req.query;

    let query = `
      SELECT id, feature_name, feature_category, short_description, detailed_description,
             keywords, available_in_plans, icon_name, display_order, is_active, created_at, updated_at
      FROM features
      WHERE 1=1
    `;
    const params = [];

    if (feature_category) {
      query += ` AND feature_category = ?`;
      params.push(feature_category);
    }

    if (is_active !== undefined) {
      query += ` AND is_active = ?`;
      params.push(toTinyIntBoolean(is_active, 1));
    }

    if (available_in_plan) {
      query += ` AND available_in_plans LIKE ?`;
      params.push(`%${available_in_plan}%`);
    }

    if (search) {
      query += ` AND (feature_name LIKE ? OR short_description LIKE ? OR detailed_description LIKE ? OR keywords LIKE ? OR feature_category LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY display_order ASC, created_at DESC`;

    const [rows] = await pool.execute(query, params);
    res.json({
      success: true,
      features: rows.map(mapFeature)
    });
  } catch (error) {
    console.error('Error fetching features:', error);
    res.status(500).json({ success: false, error: 'Failed to load features' });
  }
});

// Get single feature by id
router.get('/features/:id', authenticateToken, async (req, res) => {
  try {
    const featureId = Number(req.params.id);
    if (!featureId || Number.isNaN(featureId)) {
      return res.status(400).json({ success: false, error: 'Invalid feature id' });
    }

    const [rows] = await pool.execute(
      `SELECT id, feature_name, feature_category, short_description, detailed_description,
              keywords, available_in_plans, icon_name, display_order, is_active, created_at, updated_at
       FROM features
       WHERE id = ?`,
      [featureId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Feature not found' });
    }

    res.json({
      success: true,
      feature: mapFeature(rows[0])
    });
  } catch (error) {
    console.error('Error fetching feature:', error);
    res.status(500).json({ success: false, error: 'Failed to load feature' });
  }
});

// Create feature
router.post('/features', authenticateToken, async (req, res) => {
  try {
    const payload = normalizeFeaturePayload(req.body);
    if (payload.error) {
      return res.status(400).json({ success: false, error: payload.error });
    }

    const [result] = await pool.execute(
      `INSERT INTO features (
        feature_name, feature_category, short_description, detailed_description,
        keywords, available_in_plans, icon_name, display_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.feature_name,
        payload.feature_category,
        payload.short_description,
        payload.detailed_description,
        payload.keywords,
        payload.available_in_plans,
        payload.icon_name,
        payload.display_order,
        payload.is_active
      ]
    );

    const [createdRows] = await pool.execute(
      `SELECT id, feature_name, feature_category, short_description, detailed_description,
              keywords, available_in_plans, icon_name, display_order, is_active, created_at, updated_at
       FROM features
       WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Feature created successfully',
      feature: mapFeature(createdRows[0])
    });
  } catch (error) {
    console.error('Error creating feature:', error);
    res.status(500).json({ success: false, error: 'Failed to create feature' });
  }
});

// Update feature
router.put('/features/:id', authenticateToken, async (req, res) => {
  try {
    const featureId = Number(req.params.id);
    if (!featureId || Number.isNaN(featureId)) {
      return res.status(400).json({ success: false, error: 'Invalid feature id' });
    }

    const payload = normalizeFeaturePayload(req.body);
    if (payload.error) {
      return res.status(400).json({ success: false, error: payload.error });
    }

    const [result] = await pool.execute(
      `UPDATE features
       SET feature_name = ?, feature_category = ?, short_description = ?, detailed_description = ?,
           keywords = ?, available_in_plans = ?, icon_name = ?, display_order = ?, is_active = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        payload.feature_name,
        payload.feature_category,
        payload.short_description,
        payload.detailed_description,
        payload.keywords,
        payload.available_in_plans,
        payload.icon_name,
        payload.display_order,
        payload.is_active,
        featureId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Feature not found' });
    }

    const [updatedRows] = await pool.execute(
      `SELECT id, feature_name, feature_category, short_description, detailed_description,
              keywords, available_in_plans, icon_name, display_order, is_active, created_at, updated_at
       FROM features
       WHERE id = ?`,
      [featureId]
    );

    res.json({
      success: true,
      message: 'Feature updated successfully',
      feature: mapFeature(updatedRows[0])
    });
  } catch (error) {
    console.error('Error updating feature:', error);
    res.status(500).json({ success: false, error: 'Failed to update feature' });
  }
});

// Delete feature
router.delete('/features/:id', authenticateToken, async (req, res) => {
  try {
    const featureId = Number(req.params.id);
    if (!featureId || Number.isNaN(featureId)) {
      return res.status(400).json({ success: false, error: 'Invalid feature id' });
    }

    const [result] = await pool.execute(
      `DELETE FROM features WHERE id = ?`,
      [featureId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Feature not found' });
    }

    res.json({ success: true, message: 'Feature deleted successfully' });
  } catch (error) {
    console.error('Error deleting feature:', error);
    res.status(500).json({ success: false, error: 'Failed to delete feature' });
  }
});

// Get recharge package options (package names and currencies)
router.get('/recharge-packages/options', authenticateToken, async (req, res) => {
  try {
    await ensureDefaultRechargePackages();

    const [packageNames] = await pool.execute(
      `SELECT DISTINCT package_name
       FROM recharge_packages
       WHERE package_name IS NOT NULL AND package_name != ''
       ORDER BY package_name ASC`
    );
    const [currencies] = await pool.execute(
      `SELECT DISTINCT currency
       FROM recharge_packages
       WHERE currency IS NOT NULL AND currency != ''
       ORDER BY currency ASC`
    );

    res.json({
      success: true,
      package_names: packageNames.map((row) => row.package_name),
      currencies: currencies.map((row) => row.currency)
    });
  } catch (error) {
    console.error('Error fetching recharge package options:', error);
    res.status(500).json({ success: false, error: 'Failed to load recharge package options' });
  }
});

// Get all recharge packages
router.get('/recharge-packages', authenticateToken, async (req, res) => {
  try {
    await ensureDefaultRechargePackages();

    const { currency, search = '', is_active, is_popular } = req.query;

    let query = `
      SELECT id, package_name, display_name, description, stripe_price_id, minutes, price,
             currency, features, is_active, is_popular, sort_order, created_at, updated_at
      FROM recharge_packages
      WHERE 1=1
    `;
    const params = [];

    if (currency) {
      query += ` AND currency = ?`;
      params.push(String(currency).trim().toLowerCase());
    }

    if (is_active !== undefined) {
      query += ` AND is_active = ?`;
      params.push(toTinyIntBoolean(is_active, 1));
    }

    if (is_popular !== undefined) {
      query += ` AND is_popular = ?`;
      params.push(toTinyIntBoolean(is_popular, 0));
    }

    if (search) {
      query += ` AND (package_name LIKE ? OR display_name LIKE ? OR description LIKE ? OR stripe_price_id LIKE ? OR features LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY sort_order ASC, minutes ASC, created_at DESC`;

    const [rows] = await pool.execute(query, params);
    res.json({
      success: true,
      packages: rows.map(mapRechargePackage)
    });
  } catch (error) {
    console.error('Error fetching recharge packages:', error);
    res.status(500).json({ success: false, error: 'Failed to load recharge packages' });
  }
});

// Get single recharge package by id
router.get('/recharge-packages/:id', authenticateToken, async (req, res) => {
  try {
    const packageId = Number(req.params.id);
    if (!packageId || Number.isNaN(packageId)) {
      return res.status(400).json({ success: false, error: 'Invalid package id' });
    }

    const [rows] = await pool.execute(
      `SELECT id, package_name, display_name, description, stripe_price_id, minutes, price,
              currency, features, is_active, is_popular, sort_order, created_at, updated_at
       FROM recharge_packages
       WHERE id = ?`,
      [packageId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Recharge package not found' });
    }

    res.json({
      success: true,
      package: mapRechargePackage(rows[0])
    });
  } catch (error) {
    console.error('Error fetching recharge package:', error);
    res.status(500).json({ success: false, error: 'Failed to load recharge package' });
  }
});

// Create recharge package
router.post('/recharge-packages', authenticateToken, async (req, res) => {
  try {
    const payload = normalizeRechargePackagePayload(req.body);
    if (payload.error) {
      return res.status(400).json({ success: false, error: payload.error });
    }

    const [result] = await pool.execute(
      `INSERT INTO recharge_packages (
        package_name, display_name, description, stripe_price_id, minutes, price,
        currency, features, is_active, is_popular, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.package_name,
        payload.display_name,
        payload.description,
        payload.stripe_price_id,
        payload.minutes,
        payload.price,
        payload.currency,
        payload.features,
        payload.is_active,
        payload.is_popular,
        payload.sort_order
      ]
    );

    const [createdRows] = await pool.execute(
      `SELECT id, package_name, display_name, description, stripe_price_id, minutes, price,
              currency, features, is_active, is_popular, sort_order, created_at, updated_at
       FROM recharge_packages
       WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Recharge package created successfully',
      package: mapRechargePackage(createdRows[0])
    });
  } catch (error) {
    console.error('Error creating recharge package:', error);
    res.status(500).json({ success: false, error: 'Failed to create recharge package' });
  }
});

// Update recharge package
router.put('/recharge-packages/:id', authenticateToken, async (req, res) => {
  try {
    const packageId = Number(req.params.id);
    if (!packageId || Number.isNaN(packageId)) {
      return res.status(400).json({ success: false, error: 'Invalid package id' });
    }

    const payload = normalizeRechargePackagePayload(req.body);
    if (payload.error) {
      return res.status(400).json({ success: false, error: payload.error });
    }

    const [result] = await pool.execute(
      `UPDATE recharge_packages
       SET package_name = ?, display_name = ?, description = ?, stripe_price_id = ?, minutes = ?, price = ?,
           currency = ?, features = ?, is_active = ?, is_popular = ?, sort_order = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        payload.package_name,
        payload.display_name,
        payload.description,
        payload.stripe_price_id,
        payload.minutes,
        payload.price,
        payload.currency,
        payload.features,
        payload.is_active,
        payload.is_popular,
        payload.sort_order,
        packageId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Recharge package not found' });
    }

    const [updatedRows] = await pool.execute(
      `SELECT id, package_name, display_name, description, stripe_price_id, minutes, price,
              currency, features, is_active, is_popular, sort_order, created_at, updated_at
       FROM recharge_packages
       WHERE id = ?`,
      [packageId]
    );

    res.json({
      success: true,
      message: 'Recharge package updated successfully',
      package: mapRechargePackage(updatedRows[0])
    });
  } catch (error) {
    console.error('Error updating recharge package:', error);
    res.status(500).json({ success: false, error: 'Failed to update recharge package' });
  }
});

// Delete recharge package
router.delete('/recharge-packages/:id', authenticateToken, async (req, res) => {
  try {
    const packageId = Number(req.params.id);
    if (!packageId || Number.isNaN(packageId)) {
      return res.status(400).json({ success: false, error: 'Invalid package id' });
    }

    const [result] = await pool.execute(
      `DELETE FROM recharge_packages WHERE id = ?`,
      [packageId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Recharge package not found' });
    }

    res.json({ success: true, message: 'Recharge package deleted successfully' });
  } catch (error) {
    console.error('Error deleting recharge package:', error);
    res.status(500).json({ success: false, error: 'Failed to delete recharge package' });
  }
});

// Get intent keyword options (intent names)
router.get('/intent-keywords/options', authenticateToken, async (req, res) => {
  try {
    const [intentNames] = await pool.execute(
      `SELECT DISTINCT intent_name
       FROM intent_keywords
       WHERE intent_name IS NOT NULL AND intent_name != ''
       ORDER BY intent_name ASC`
    );

    res.json({
      success: true,
      intent_names: intentNames.map((row) => row.intent_name)
    });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.json({
        success: true,
        intent_names: []
      });
    }

    console.error('Error fetching intent keyword options:', error);
    res.status(500).json({ success: false, error: 'Failed to load intent keyword options' });
  }
});

// Get all intent keywords
router.get('/intent-keywords', authenticateToken, async (req, res) => {
  try {
    const { intent_name, search = '', is_active } = req.query;

    let query = `
      SELECT id, intent_name, keywords, priority, is_active, created_at, updated_at
      FROM intent_keywords
      WHERE 1=1
    `;
    const params = [];

    if (intent_name) {
      query += ` AND intent_name = ?`;
      params.push(String(intent_name).trim());
    }

    if (is_active !== undefined) {
      query += ` AND is_active = ?`;
      params.push(toTinyIntBoolean(is_active, 1));
    }

    if (search) {
      query += ` AND (intent_name LIKE ? OR keywords LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY priority DESC, created_at DESC, id DESC`;

    const [rows] = await pool.execute(query, params);
    res.json({
      success: true,
      intent_keywords: rows.map(mapIntentKeyword)
    });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.json({
        success: true,
        intent_keywords: []
      });
    }

    console.error('Error fetching intent keywords:', error);
    res.status(500).json({ success: false, error: 'Failed to load intent keywords' });
  }
});

// Get single intent keyword by id
router.get('/intent-keywords/:id', authenticateToken, async (req, res) => {
  try {
    const intentId = Number(req.params.id);
    if (!intentId || Number.isNaN(intentId)) {
      return res.status(400).json({ success: false, error: 'Invalid intent keyword id' });
    }

    const [rows] = await pool.execute(
      `SELECT id, intent_name, keywords, priority, is_active, created_at, updated_at
       FROM intent_keywords
       WHERE id = ?`,
      [intentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Intent keyword not found' });
    }

    res.json({
      success: true,
      intent_keyword: mapIntentKeyword(rows[0])
    });
  } catch (error) {
    console.error('Error fetching intent keyword:', error);
    res.status(500).json({ success: false, error: 'Failed to load intent keyword' });
  }
});

// Create intent keyword
router.post('/intent-keywords', authenticateToken, async (req, res) => {
  try {
    const payload = normalizeIntentKeywordPayload(req.body);
    if (payload.error) {
      return res.status(400).json({ success: false, error: payload.error });
    }

    const [result] = await pool.execute(
      `INSERT INTO intent_keywords (intent_name, keywords, priority, is_active)
       VALUES (?, ?, ?, ?)`,
      [
        payload.intent_name,
        payload.keywords,
        payload.priority,
        payload.is_active
      ]
    );

    const [createdRows] = await pool.execute(
      `SELECT id, intent_name, keywords, priority, is_active, created_at, updated_at
       FROM intent_keywords
       WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Intent keyword created successfully',
      intent_keyword: mapIntentKeyword(createdRows[0])
    });
  } catch (error) {
    console.error('Error creating intent keyword:', error);
    res.status(500).json({ success: false, error: 'Failed to create intent keyword' });
  }
});

// Update intent keyword
router.put('/intent-keywords/:id', authenticateToken, async (req, res) => {
  try {
    const intentId = Number(req.params.id);
    if (!intentId || Number.isNaN(intentId)) {
      return res.status(400).json({ success: false, error: 'Invalid intent keyword id' });
    }

    const payload = normalizeIntentKeywordPayload(req.body);
    if (payload.error) {
      return res.status(400).json({ success: false, error: payload.error });
    }

    const [result] = await pool.execute(
      `UPDATE intent_keywords
       SET intent_name = ?, keywords = ?, priority = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        payload.intent_name,
        payload.keywords,
        payload.priority,
        payload.is_active,
        intentId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Intent keyword not found' });
    }

    const [updatedRows] = await pool.execute(
      `SELECT id, intent_name, keywords, priority, is_active, created_at, updated_at
       FROM intent_keywords
       WHERE id = ?`,
      [intentId]
    );

    res.json({
      success: true,
      message: 'Intent keyword updated successfully',
      intent_keyword: mapIntentKeyword(updatedRows[0])
    });
  } catch (error) {
    console.error('Error updating intent keyword:', error);
    res.status(500).json({ success: false, error: 'Failed to update intent keyword' });
  }
});

// Delete intent keyword
router.delete('/intent-keywords/:id', authenticateToken, async (req, res) => {
  try {
    const intentId = Number(req.params.id);
    if (!intentId || Number.isNaN(intentId)) {
      return res.status(400).json({ success: false, error: 'Invalid intent keyword id' });
    }

    const [result] = await pool.execute(
      `DELETE FROM intent_keywords WHERE id = ?`,
      [intentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Intent keyword not found' });
    }

    res.json({ success: true, message: 'Intent keyword deleted successfully' });
  } catch (error) {
    console.error('Error deleting intent keyword:', error);
    res.status(500).json({ success: false, error: 'Failed to delete intent keyword' });
  }
});

// Get all contacts (read-only)
router.get('/contacts', authenticateToken, async (req, res) => {
  try {
    const { search = '', email = '' } = req.query;

    let query = `
      SELECT id, name, email, message, created_at
      FROM contacts
      WHERE 1=1
    `;
    const params = [];

    if (email) {
      query += ` AND email = ?`;
      params.push(String(email).trim());
    }

    if (search) {
      query += ` AND (name LIKE ? OR email LIKE ? OR message LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY created_at DESC, id DESC`;

    const [rows] = await pool.execute(query, params);
    res.json({
      success: true,
      contacts: rows
    });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.json({
        success: true,
        contacts: []
      });
    }

    console.error('Error fetching contacts:', error);
    res.status(500).json({ success: false, error: 'Failed to load contacts' });
  }
});

// Get FAQ options (categories and need_for)
router.get('/options', authenticateToken, async (req, res) => {
  try {
    const [categories] = await pool.execute(
      `SELECT DISTINCT category FROM faqs WHERE category IS NOT NULL AND category != '' ORDER BY category ASC`
    );
    const [needFor] = await pool.execute(
      `SELECT DISTINCT need_for FROM faqs WHERE need_for IS NOT NULL AND need_for != '' ORDER BY need_for ASC`
    );

    res.json({
      success: true,
      categories: categories.map(row => row.category),
      need_for: needFor.map(row => row.need_for)
    });
  } catch (error) {
    console.error('Error fetching FAQ options:', error);
    res.status(500).json({ success: false, error: 'Failed to load FAQ options' });
  }
});

// Get all FAQs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, need_for, search = '', is_active } = req.query;

    let query = `
      SELECT id, question, answer, category, need_for, 
             display_order, is_active, created_at, updated_at
      FROM faqs 
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (need_for) {
      query += ` AND need_for = ?`;
      params.push(need_for);
    }

    if (is_active !== undefined) {
      query += ` AND is_active = ?`;
      params.push(toTinyIntBoolean(is_active, 1));
    }

    if (search) {
      query += ` AND (question LIKE ? OR answer LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY display_order ASC, created_at DESC`;

    const [faqs] = await pool.execute(query, params);
    res.json({ success: true, faqs });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ success: false, error: 'Failed to load FAQs' });
  }
});

// Create FAQ
router.post('/', authenticateToken, async (req, res) => {
  try {
    const payload = normalizeFaqPayload(req.body);
    if (payload.error) {
      return res.status(400).json({ success: false, error: payload.error });
    }

    const [result] = await pool.execute(
      `INSERT INTO faqs (question, answer, category, need_for, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        payload.question,
        payload.answer,
        payload.category,
        payload.need_for,
        payload.display_order,
        payload.is_active
      ]
    );

    const [createdRows] = await pool.execute(
      `SELECT id, question, answer, category, need_for, display_order, is_active, created_at, updated_at
       FROM faqs WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'FAQ created successfully',
      faq: createdRows[0]
    });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({ success: false, error: 'Failed to create FAQ' });
  }
});

// Update FAQ
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const faqId = Number(req.params.id);
    if (!faqId || Number.isNaN(faqId)) {
      return res.status(400).json({ success: false, error: 'Invalid FAQ id' });
    }

    const payload = normalizeFaqPayload(req.body);
    if (payload.error) {
      return res.status(400).json({ success: false, error: payload.error });
    }

    const [result] = await pool.execute(
      `UPDATE faqs 
       SET question = ?, answer = ?, category = ?, need_for = ?, 
           display_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        payload.question,
        payload.answer,
        payload.category,
        payload.need_for,
        payload.display_order,
        payload.is_active,
        faqId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'FAQ not found' });
    }

    const [updatedRows] = await pool.execute(
      `SELECT id, question, answer, category, need_for, display_order, is_active, created_at, updated_at
       FROM faqs WHERE id = ?`,
      [faqId]
    );

    res.json({ success: true, message: 'FAQ updated successfully', faq: updatedRows[0] });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({ success: false, error: 'Failed to update FAQ' });
  }
});

// Delete FAQ
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const faqId = Number(req.params.id);
    if (!faqId || Number.isNaN(faqId)) {
      return res.status(400).json({ success: false, error: 'Invalid FAQ id' });
    }

    const [result] = await pool.execute(
      'DELETE FROM faqs WHERE id = ?',
      [faqId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'FAQ not found' });
    }

    res.json({ success: true, message: 'FAQ deleted successfully' });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({ success: false, error: 'Failed to delete FAQ' });
  }
});

module.exports = router;
