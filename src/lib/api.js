import Arweave from 'arweave';
export const arweave = Arweave.init({});

export const idState = {}

export const getArweaveId = async (address) => {
	if (!address || (idState[address] || {}).request) { return }
	if (!isWellFormattedAddress(address)) { return }
	try {
		const results = (await arweave.api.post('/graphql', buidIdQuery(address)));
    console.log(address, results);
		if (!results || results.data.data.transactions.edges.length == 0) { return }
		const arweaveIdTx = results.data.data.transactions.edges[0];
    console.log(arweaveIdTx);
		const tags = unpackTags(arweaveIdTx.tags)
		if (tags.Image && !tags.Image.match(/^[a-z0-9_-]{43}$/i)) { delete tags.image }
		if (!tags.Image && tags['Content-Type']?.includes('image')) { tags.Image = arweaveIdTx.id }
		idState[address].image = tags.image;
    idState[address].name = tags.name;
	} catch (e) {
		console.error(e)
	}
}

function buidIdQuery(address) {
  const ownersFilter = `owners: ["${address}"]`;

  const queryObject = {
    query: `{
      transactions(first:1, ${ownersFilter}
        tags: [
          {
          name: "App-Name",
          values: ["arweave-id"]
          }
        ])
      {
        edges {
          node {
            id
            tags {
              name,
              value
            }
          }
        }
      }
    }`}
  //console.log(queryObject.query);
  return queryObject;
}

export const unpackTags = (tags) => {
	const result = {};
	for (const { name, value } of tags) { result[name] ??= value }
	return result
}

export const isWellFormattedAddress = (input) => {
  const re = /^[a-z0-9_-]{43}$/i;
  return re.test(input);
}

export const createPostData = (node) => {
  const ownerAddress = node.owner.address;
  const height = node.block ? node.block.height : -1;
  const topicTag = node.tags && node.tags.find((a) => a.name === 'Topic');
  const topic = topicTag ? topicTag.value : null;
  const timestamp = node.block ? parseInt(node.block.timestamp, 10) * 1000 : -1;
  const postItem = {
    txid: node.id,
    owner: ownerAddress,
    topic: topic,
    height: height,
    length: node.data.size,
    timestamp: timestamp,
    request: null,
  }
  postItem.request = arweave.api.get(`/${node.id}`, { timeout: 10000 })
    .catch(() => { postItem.error = "timeout loading data"});
  return postItem;
}

export const buildQuery = ({count, address, topic}) => {
  
  count = Math.min(100, count || 100);
  
  let ownersFilter = '';
  if (address) {
    ownersFilter = `owners: ["${address}"],`
  }

  let topicFilter = '';
  if (topic) {
    topicFilter = `{
      name: "Topic",
      values: ["${topic}"]
    },`
  }

  const queryObject = { query: `{
    transactions(first: ${count}, ${ownersFilter}
      tags: [
        {
          name: "App-Name",
          values: ["PublicSquare"]
        },
        {
          name: "Content-Type",
          values: ["text/plain"]
        },
        ${topicFilter}
      ]
    ) {
      edges {
        node {
          id
          owner {
            address
          }
          data {
            size
          }
          block {
            height
            timestamp
          }
          tags {
            name,
            value
          }
        }
      }
    }
  }`}
  console.log(queryObject.query);
  return queryObject;
}

// in miliseconds
var units = {
  year  : 24 * 60 * 60 * 1000 * 365,
  month : 24 * 60 * 60 * 1000 * 365/12,
  day   : 24 * 60 * 60 * 1000,
  hour  : 60 * 60 * 1000,
  minute: 60 * 1000,
  second: 1000
}

var rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export const getRelativeTime = (ts1, ts2) => {
  var elapsed = ts1 - ts2
  // "Math.abs" accounts for both "past" & "future" scenarios
  for (var u in units) 
    if (Math.abs(elapsed) > units[u] || u === 'second') 
      return rtf.format(Math.round(elapsed/units[u]), u)
}

export const getPostTime = (timestamp) => {
  if (timestamp < 0) {
    return "pending...";
  }
  return getRelativeTime(timestamp, Date.now());
}

export const abbreviateAddress = (address) => {
  if (!address)
    return address;
  const firstFive = address.substring(0,5);
  const lastFour = address.substring(address.length-4);
  return `${firstFive}..${lastFour }`;
}

export const getTopicString = (input) => {
  let dashedTopic = (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  return dashedTopic;
}

export const delay = (t) => {
  return new Promise(function(resolve) {
    setTimeout(function() {
      resolve();
    }, t);
  });
}

export const delayResults = (milliseconds, results) => {
  return delay(milliseconds).then(function() {
    return results;
  });
}