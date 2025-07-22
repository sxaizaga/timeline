// AWS Lambda handler para recibir imagen en base64, guardar en S3 y devolver una URL firmada de máximo tiempo
// Requiere: AWS SDK v2 (handler para Node.js 18.x o superior)

import AWS from 'aws-sdk';
const s3 = new AWS.S3();

const BUCKET = process.env.AWS_BUCKET_NAME;
const REGION = process.env.AWS_REGION;
const MAX_EXPIRATION = 7 * 24 * 60 * 60; // 7 días en segundos (máximo permitido por AWS)

exports.handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { base64, filename, mimetype } = body;
    if (!base64 || !filename || !mimetype) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Faltan datos' }) };
    }
    const buffer = Buffer.from(base64, 'base64');
    const key = `${Date.now()}_${filename}`;
    await s3.putObject({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      ACL: 'private',
    }).promise();
    const url = s3.getSignedUrl('getObject', {
      Bucket: BUCKET,
      Key: key,
      Expires: MAX_EXPIRATION,
    });
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
