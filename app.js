// This loads the environment variables from the .env file
require('dotenv-extended').load();

var builder = require('botbuilder');
var restify = require('restify');
var spellService = require('./spell-service');
var MovieDB = require('moviedb')('d28553dc44511b728b926162154b56b5');

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
		console.log('%s listening to %s', server.name, server.url);
});

var connector = new builder.ChatConnector({
		appId: process.env.MICROSOFT_APP_ID,
		appPassword: process.env.MICROSOFT_APP_PASSWORD
});

server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector, function (session) {
		session.send('Sorry, I did not understand \'%s\'. Type \'help\' if you need assistance.', session.message.text);
});

var recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
bot.recognizer(recognizer);

bot.dialog('Help', function (session) {
		session.endDialog('Hi! Try asking me things like \'tell me about this movie\' or \'I want to know more about this actor\'');
}).triggerAction({
		matches: 'Help'
});

bot.dialog('SearchFilms',
		function (session, args, next) {
				var movieEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'MovieTitle');
				var serieEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'SerieTitle');
				if (movieEntity) {
						MovieDB.searchMovie({ query: movieEntity.entity }, (err, res) => {
							if (res.results.length == 0){
								session.send('Sorry, we did not found the movie called ' + movieEntity.entity, session.message.text);
								session.endDialog();
							} else {
								var movie = res.results[0];
								var movies = [];
								movies.push(movie);
								var message = new builder.Message()
								.attachmentLayout(builder.AttachmentLayout.carousel)
								.attachments(movies.map(infoAsAttachment));
								session.send(message);
								session.endDialog();
							}
						});
				}
				else { Prompts.text(session, 'Please enter a film'); }
		}).triggerAction({
		matches: 'SearchFilms'
});

// Spell Check
if (process.env.IS_SPELL_CORRECTION_ENABLED === 'true') {
		bot.use({
				botbuilder: function (session, next) {
						spellService
								.getCorrectedText(session.message.text)
								.then(function (text) {
										session.message.text = text;
										next();
								})
								.catch(function (error) {
										console.error(error);
										next();
								});
				}
		});
}

// Helpers
function infoAsAttachment(info) {
		return new builder.HeroCard()
				.title(info.title)
				.subtitle(info.release_date)
				.text(info.overview)
				.images([new builder.CardImage().url('https://image.tmdb.org/t/p/w150/'+info.poster_path)])
}
