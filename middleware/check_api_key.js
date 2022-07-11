const verifyApiKey = async (req, res, next) => {
    try {
      const { apikey } = req.headers;
    
      if (!apikey) {
        return res.status(400).send({ err: "API key not provided" });
      }
  
      if (apikey !== process.env.API_KEY) {
        return res.status(403).send({
          err: "Unauthorized access. Invalid api key.",
        });
      }
  
      next();
    } catch (err) {
      return res.status(500).send({
        err: err.message,
      });
    }
  };
  
module.exports = verifyApiKey;