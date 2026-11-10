'use strict';

const fs = require('fs');
const path = require('path');

const assets = path.join(__dirname, '..', 'public', 'assets');

fs.rmSync(assets, { recursive: true, force: true });
