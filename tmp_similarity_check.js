const Graph=require('./src/contagionGraph');
const g=new Graph({useLSH:false,similarityThreshold:0.75});
const bot={timingCV:0.1,uaEntropy:1.0,pathDiversity:0.5,headerCount:3,acceptLangRate:0.0,methodVariety:1.0,sizeVariance:0.2};
const hum={timingCV:0.8,uaEntropy:6.0,pathDiversity:4.5,headerCount:12,acceptLangRate:1.0,methodVariety:3.0,sizeVariance:2.5};
console.log('bot',g._extractVector(bot));
console.log('hum',g._extractVector(hum));
console.log('cosine',g._cosineSimilarity(g._extractVector(bot),g._extractVector(hum)));
