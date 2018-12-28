const Documents = require('./documents');
const allIds = [];
const byId = {};
let runningId = 0;
const HOST = `http://localhost:${process.env.PORT}`;

exports.findByPublicKey = publicKey => {
	let found = allIds
		.map(id => byId[id])
		.filter(usr => usr.publicKeys && usr.publicKeys.includes(publicKey));
	if (!found.length) return null;
	return found[0];
};

exports.findById = id => {
	return byId[id];
};

exports.create = (data, publicKey) => {
	let user = Object.assign({}, data, { id: ++runningId });
	user.publicKeys = [publicKey];
	allIds.push(user.id);
	byId[user.id] = user;
	return user;
};

exports.update = (id, data) => {
	if (!byId[id]) return null;
	let oldAttributes = byId[id].attributes;
	if (oldAttributes) {
		oldAttributes.forEach(attr => {
			attr.documents.forEach(doc => {
				Documents.delete(doc.localId);
			});
		});
	}
	if (data.attributes) {
		data.attributes = data.attributes.map(attr => {
			attr.documents = attr.documents.map(doc => {
				let newDoc = Documents.create(doc);
				let link = `${HOST}/documents/${newDoc.id}`;
				doc.localId = newDoc.id;
				doc.content = link;
				return doc;
			});
			return attr;
		});
	}
	byId[id] = Object.assign({}, byId[id], data, { id });
	return byId[id];
};

exports.findAll = () => {
	return allIds.map(id => byId[id]);
};
