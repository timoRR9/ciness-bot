var request = require('request');

var SPELL_CHECK_API_URL = 'https://api.cognitive.microsoft.com/bing/v7.0/spellcheck',
    SPELL_CHECK_API_KEY = process.env.BING_SPELL_CHECK_API_KEY;

/**
 * Gets the correct spelling for the given text
 * @param {string} text The text to be corrected
 * @returns {Promise} Promise with corrected text if succeeded, error otherwise.
 */
exports.getCorrectedText = function (text) {
    return new Promise(
        function (resolve, reject) {
            if (text) {
                var requestData = {
                    url: SPELL_CHECK_API_URL,
                    headers: {
                        "Ocp-Apim-Subscription-Key": SPELL_CHECK_API_KEY
                    },
                    form: {
                        text: text
                    },
                    json: true
                }

                request.post(requestData, function (error, response, body) {
                    if (error) {
                        reject(error);
                    }
                    else if (response.statusCode != 200) {
                        reject(body);
                    }
                    else {
                        var previousOffset = 0;
                        var result = '';

                        for (var i = 0; i < body.flaggedTokens.length; i++) {
                            var element = body.flaggedTokens[i];

                            // Append the text from the previous offset to the current misspelled word offset
                            result += text.substring(previousOffset, element.offset);

                            // Append the corrected word instead of the misspelled word
                            result += element.suggestions[0].suggestion;

                            // Increment the offset by the length of the misspelled word
                            previousOffset = element.offset + element.token.length;
                        }

                        // Append the text after the last misspelled word.
                        if (previousOffset < text.length) {
                            result += text.substring(previousOffset);
                        }

                        resolve(result);
                    }

                });
            } else {
                resolve(text);
            }
        }
    )
}
