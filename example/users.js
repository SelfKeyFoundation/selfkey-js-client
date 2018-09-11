const allIds = [];
const byId = {};
let runningId = 0;

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
	if (!data.email) {
		return null;
	}
	let user = Object.assign({}, data, { id: ++runningId });
	user.publicKeys = [publicKey];
	allIds.push(user.id);
	byId[user.id] = user;
	return user;
};

exports.update = (id, newData) => {
	if (!byId[id]) return null;
	byId[id] = Object.assign({}, byId[id], newData, { id });
	return byId[id];
};
