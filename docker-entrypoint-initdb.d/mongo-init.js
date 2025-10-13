db = db.getSiblingDB('imshaby');
db.createCollection('init');
db.init.insert({ createdAt: new Date() });