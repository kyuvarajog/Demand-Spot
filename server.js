const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const upload = multer();

app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SQLite DB connection
const db = new sqlite3.Database('./demandspot.db', (err) => {
  if (err) {
    console.error('DB Connection Error:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite');

  // Create ideas table if not exists
  db.run(`
    CREATE TABLE IF NOT EXISTS ideas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location TEXT NOT NULL,
      idea TEXT NOT NULL,
      min_budget REAL NOT NULL,
      max_budget REAL NOT NULL,
      likes INTEGER DEFAULT 0
    )
  `);
});

// Get business ideas within budget
app.get('/api/ideas', (req, res) => {
  const budget = parseFloat(req.query.budget);

  if (isNaN(budget)) {
    return res.sendFile(path.join(__dirname, 'public', 'nobudget.html'));
  }

  db.all(
    'SELECT * FROM ideas WHERE min_budget <= ? AND max_budget >= ?',
    [budget, budget],
    (err, rows) => {
      if (err) return res.status(500).send('Server error');
      res.json(rows);
    }
  );
});

// Submit a new business idea with min and max budget
app.post('/api/submit', upload.none(), (req, res) => {
  const { location, idea, min_budget, max_budget } = req.body;

  if (!location || !idea || !min_budget || !max_budget) {
    return res.status(400).send('Missing fields');
  }

  const min = parseFloat(min_budget);
  const max = parseFloat(max_budget);

  if (isNaN(min) || isNaN(max) || min < 0 || max < min) {
    return res.status(400).send('Invalid budget values');
  }

  db.run(
    'INSERT INTO ideas (location, idea, min_budget, max_budget) VALUES (?, ?, ?, ?)',
    [location, idea, min, max],
    function (err) {
      if (err) return res.status(500).send('Server error');
      res.send('Idea submitted successfully!');
    }
  );
});

// Uplift (👍) an idea
app.post('/api/uplift/:id', (req, res) => {
  const ideaId = parseInt(req.params.id);

  if (isNaN(ideaId)) return res.status(400).send('Invalid idea ID');

  db.run(
    'UPDATE ideas SET likes = likes + 1 WHERE id = ?',
    [ideaId],
    function (err) {
      if (err) return res.status(500).send('Server error');
      if (this.changes === 0) return res.status(404).send('Idea not found');

      db.get('SELECT likes FROM ideas WHERE id = ?', [ideaId], (err2, row) => {
        if (err2) return res.status(500).send('Error fetching like count');
        res.json({ likes: row.likes });
      });
    }
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
