const crypto = require('crypto');

function generateUniqueNumber(uniqueId, numberLength = 13) {
  const currentDate = new Date();
  const year = (currentDate.getFullYear() % 100).toString().padStart(2, '0');
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  const day = currentDate.getDate().toString().padStart(2, '0');
  
  // Using crypto for cryptographically secure random numbers
  // Generate a random number between 100-999 using secure random bytes
  const randomBytes = crypto.randomBytes(2);
  const randomValue = randomBytes.readUInt16BE(0) % 900 + 100;
  const randomNumber = randomValue.toString().padStart(3, '0');
  
  const number = (uniqueId + 1).toString().padStart(numberLength - 9, '0'); // numberLength - 9 , 9 is length day + month + year + randomNumber
  return day + month + year + randomNumber + number;
}

module.exports = generateUniqueNumber;