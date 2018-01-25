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

bot.dialog('Help',
	function (session) {
		session.endDialog('Hi! Try asking me things like \'tell me about this movie\' or \'I want to know more about this actor\'');
	}).triggerAction({
		matches: 'Help'
});

// MOVIE / TV SHOW INFORMATIONS
bot.dialog('VideoType.GetInformations',
	function (session, args, next) {
		var movieTitle = builder.EntityRecognizer.findEntity(args.intent.entities, 'Movie.Title');
		var videoType = builder.EntityRecognizer.findEntity(args.intent.entities, 'Video.Type');
		if (movieTitle) {
			if (videoType.entity == 'movie') {
				MovieDB.searchMovie({ query: movieTitle.entity }, (err, res) => {
					displayMoviesGlobalInfos(session, res, 'Movie');
				});
			} else {
				MovieDB.searchTv({ query: movieTitle.entity }, (err, res) => {
					displayMoviesGlobalInfos(session, res, 'Tv show');
				});
			}
		} else { builder.Prompts.text(session, 'Sorry I didn\'t understand the movie/serie you\'re talking about..'); }
	}).triggerAction({
	matches: 'VideoType.GetInformations'
});

bot.dialog('VideoType.GetTrailer',
    function (session, args, next) {
        var videoType = builder.EntityRecognizer.findEntity(args.intent.entities, 'Movie.Title');
        //var serieEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'SerieTitle');
        if (videoType) {
					if (videoType.entity == 'movie' || videoType.entity == 'movies' || videoType.entity == 'film' || videoType.entity == 'films') {
	            MovieDB.searchMovie({ query: videoType.entity }, (err, res) => {
	              var movie = res.results[0];
	              var movies = [];
	              console.log(movie.id);
	              MovieDB.movieVideos({ id: movie.id }, (err, res) => {
	                var results = res.results;
	                var ytKey = "";
	                if(results.length > 1){
	                  for(var result in results){
	                    if(result.type == "Trailer"){
	                      ytKey = result.key;
	                    }
	                  }
	                } else {
	                  ytKey = results[0].key;
	                }
									var info = {
										movieTitle: movie.title,
										ytKey: ytKey
									}
	                var message = new builder.Message()
	                .addAttachment(trailerCard(info));
	                session.send(message);
	                session.endDialog();
	              });
	            });
					} else {
						MovieDB.searchTv({ query: videoType.entity }, (err, res) => {
							var tvShow = res.results[0];
							var tvShow = [];
							console.log(tvShow.id);
							MovieDB.tvVideos({ id: tvShow.id }, (err, res) => {
								var results = res.results;
								var ytKey = "";
								if(results.length > 1){
									for(var result in results){
										if(result.type == "Trailer"){
											ytKey = result.key;
										}
									}
								} else {
									ytKey = results[0].key;
								}
								var info = {
									movieTitle: movie.title,
									ytKey: ytKey
								}
								var message = new builder.Message()
								.addAttachment(trailerCard(info));
								session.send(message);
								session.endDialog();
							});
						});
					}
	      } else { builder.prompts.text(session, 'Sorry I didn\'t understand the movie/serie you\'re talking about..'); }
    }).triggerAction({
    	matches: 'VideoType.GetTrailer'
});

bot.dialog('VideoType.GetSuggestion',
	function (session, args, next) {
			var videoType = builder.EntityRecognizer.findEntity(args.intent.entities, 'Video.Type');
			if (videoType.entity == 'movie' || videoType.entity == 'movies' || videoType.entity == 'film' || videoType.entity == 'films') {
				MovieDB.discoverMovie({}, (err, res) => {
						displayMoviesGlobalInfos(session, res, 'Movie');
				});
			} else {
				MovieDB.discoverTv({}, (err, res) => {
					 displayMoviesGlobalInfos(session, res, 'Tv');
				});
			}

	}).triggerAction({
	matches: 'VideoType.GetSuggestion'
});

bot.dialog('VideoType.Popular',
	function (session, args, next) {
			var videoType = builder.EntityRecognizer.findEntity(args.intent.entities, 'Video.Type');
			if (videoType.entity == 'movie' || videoType.entity == 'movies' || videoType.entity == 'film' || videoType.entity == 'films') {
				MovieDB.miscPopularMovies({}, (err, res) => {
						displayMoviesGlobalInfos(session, res, 'Movie');
				});
			} else {
				MovieDB.miscPopularTvs({}, (err, res) => {
					 displayMoviesGlobalInfos(session, res, 'Tv');
				});
			}

	}).triggerAction({
	matches: 'VideoType.Popular'
});

bot.dialog('VideoType.TopRated',
	function (session, args, next) {
			var videoType = builder.EntityRecognizer.findEntity(args.intent.entities, 'Video.Type');
			if (videoType.entity == 'movie' || videoType.entity == 'movies' || videoType.entity == 'film' || videoType.entity == 'films') {
				MovieDB.miscTopRatedMovies({}, (err, res) => {
						displayMoviesGlobalInfos(session, res, 'Movie');
				});
			} else {
				MovieDB.miscTopRatedTvs({}, (err, res) => {
					 displayMoviesGlobalInfos(session, res, 'Tv');
				});
			}

	}).triggerAction({
	matches: 'VideoType.TopRated'
});

bot.dialog('Movie.NowPlayingMovies',
	function (session, args, next) {
		MovieDB.miscNowPlayingMovies({}, (err, res) => {
				displayMoviesGlobalInfos(session, res, 'Movie');
		});
	}).triggerAction({
	matches: 'Movie.NowPlayingMovies'
});

bot.dialog('Movie.UpcomingMovies',
	function (session, args, next) {
		MovieDB.miscUpcomingMovies({}, (err, res) => {
				displayMoviesGlobalInfos(session, res, 'Movie');
		});
	}).triggerAction({
	matches: 'Movie.UpcomingMovies'
});

bot.dialog('Movie.GetReviews',
    function (session, args, next) {
        var movieEnt = builder.EntityRecognizer.findEntity(args.intent.entities, 'Movie.Title');
        //var serieEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'SerieTitle');
        if (movieEnt) {
          MovieDB.searchMovie({ query: movieEnt.entity }, (err, res) => {
            var movie = res.results[0];
            var movies = [];
            MovieDB.movieReviews({ id: movie.id }, (err, res) => {
							displayMoviesReviews(session, res);
            });
          });
	      } else { builder.prompts.text(session, 'Sorry I didn\'t understand the movie you\'re talking about..'); }
    }).triggerAction({
    	matches: 'Movie.GetReviews'
});

bot.dialog('VideoType.GetSimilar',
    function (session, args, next) {
        var videoType = builder.EntityRecognizer.findEntity(args.intent.entities, 'Video.Type');
        var videoEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'Movie.Title');
        if (videoEntity) {
					if (videoType.entity !== 'movie' || videoType.entity !== 'movies' || videoType.entity !== 'film' || videoType.entity !== 'films') {
	          MovieDB.searchTv({ query: videoEntity.entity }, (err, res) => {
	            var serie = res.results[0];
	            var movies = [];
	            MovieDB.tvSimilar({ id: serie.id }, (err, res) => {
								displayVideoSimilar(session, res);
	            });
	          });
					} else {
						MovieDB.searchMovie({ query: videoEntity.entity }, (err, res) => {
						 var serie = res.results[0];
						 var movies = [];
						 MovieDB.movieSimilar({ id: serie.id }, (err, res) => {
							 displayVideoSimilar(session, res);
						 });
					 });
					}
	      } else { prompts.text(session, 'Sorry I didn\'t understand the movie/serie you\'re talking about..'); }
    }).triggerAction({
    	matches: 'VideoType.GetSimilar'
});

// ACTOR INFORMATIONS
bot.dialog('ActorGetAllInformations',
	function (session, args, next) {
		console.log(args.intent)
		var actorName = builder.EntityRecognizer.findEntity(args.intent.entities, 'Actor.Name');
		if (actorName) {
			MovieDB.searchPerson({ query: actorName.entity }, (err, res) => {
				displayActorGlobalInfos(session, res, 'Actor');
			});
		} else { builder.Prompts.text(session, 'Please enter an actor'); }
	}).triggerAction({
		matches: 'Actor.GetAllInformations'
});

bot.dialog('Actor.GetPopular',
	function (session, args, next) {
		MovieDB.personPopular({}, (err, res) => {
			displayActorGlobalInfos(session, res, 'Actor');
		});
	}).triggerAction({
		matches: 'Actor.GetPopular'
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
function displayMoviesGlobalInfos(session, res, videoType){
	if (res.results.length == 0){
		session.send('Sorry, we did not found the ' + videoType + ' called ' + movieTitle.entity, session.message.text);
		session.endDialog();
	} else {
		var message = new builder.Message()
		.attachmentLayout(builder.AttachmentLayout.carousel)
		.attachments(res.results.map(infoAsAttachment));
		session.send(message);
		session.endDialog();
	}
}

function displayMoviesReviews(session, res){
	if (res.results.length == 0){
		session.send('Sorry, we did not found the ' + videoType + ' called ' + movieTitle.entity, session.message.text);
		session.endDialog();
	} else {
		var message = new builder.Message()
		.attachmentLayout(builder.AttachmentLayout.carousel)
		.attachments(res.results.map(reviewAsAttachment));
		session.send(message);
		session.endDialog();
	}
}

function displayVideoSimilar(session, res){
	if (res.results.length == 0){
		session.send('Sorry, we did not found the serie called ' + movieTitle.entity, session.message.text);
		session.endDialog();
	} else {
		var message = new builder.Message()
		.attachmentLayout(builder.AttachmentLayout.carousel)
		.attachments(res.results.map(similarAsAttachment));
		session.send(message);
		session.endDialog();
	}
}

function displayActorGlobalInfos(session, res, actors){
	if (res.results.length == 0){
		session.send('Sorry, we did not found the ' + actors + ' called ' + actors.entity, session.message.text);
		session.endDialog();
	} else {
		var actors = [];
		for (var i = 0; i < res.results.length; i++) {
			var known_for = '';
			for (var index = 0; index < res.results[i].known_for.length; index++) {
				if(res.results[i].known_for[index].title){
					if(known_for == '') known_for += 'Know for : ';
					known_for += res.results[i].known_for[index].title + ' (' + res.results[i].known_for[index].media_type + ')';
					if(index < res.results[i].known_for.length - 1) known_for += ', ';
				}
			}
			res.results[i].known_for = known_for;
			actors.push(res.results[i]);
		}
		var message = new builder.Message()
		.attachmentLayout(builder.AttachmentLayout.carousel)
		.attachments(actors.map(infoAsAttachmentActor));
		session.send(message);
		session.endDialog();
	}
}

function infoAsAttachment(info) {
	return new builder.ThumbnailCard()
		.title(info.title ? info.title : info.name)
		.subtitle(info.release_date)
		.text(info.overview)
		.images([new builder.CardImage().url('https://image.tmdb.org/t/p/w150/'+info.poster_path)])
}

function similarAsAttachment(info) {
	return new builder.ThumbnailCard()
		.title(info.name)
		.subtitle(info.first_air_date)
		.text(info.overview)
		.images([new builder.CardImage().url('https://image.tmdb.org/t/p/w150/'+info.poster_path)])
}

function infoAsAttachmentActor(info) {
	return new builder.ThumbnailCard()
		.title(info.name)
		.text(info.known_for)
		.images([new builder.CardImage().url('https://image.tmdb.org/t/p/w150/'+info.profile_path)])
}

function reviewAsAttachment(info) {
	return new builder.ThumbnailCard()
		.title(info.author)
		.text(info.content)
}

function trailerCard(info){
	return new builder.VideoCard()
		.title(info.movieTitle)
		.media([
			{ url: 'https://www.youtube.com/watch?v=' + info.ytKey }
		]);
}
