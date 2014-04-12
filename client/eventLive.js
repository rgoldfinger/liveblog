//--------------------------------------------
//-------      event Live       --------------
//--------------------------------------------


////////// Helpers for in-place editing //////////

// Returns an event map that handles the "escape" and "return" keys and
// "blur" events on a text input (given by selector) and interprets them
// as "ok" or "cancel".
var okCancelEvents = function (selector, callbacks) {
  var ok = callbacks.ok || function () {};
  var cancel = callbacks.cancel || function () {};

  var events = {};
  events['keyup '+selector+', keydown '+selector+', focusout '+selector] =
    function (evt) {
      if (evt.type === "keydown" && evt.which === 27) {
        // escape = cancel
        cancel.call(this, evt);
      } else if ( ( evt.type === "keydown" && evt.ctrlKey && ( evt.which === 13 || evt.which === 10) )
      		|| evt.type === "focusout") {
        // blur = ok/submit if non-empty - return does not submit!
        var value = String(evt.target.value || "");
        if (value)
          ok.call(this, value, evt);
        else
          cancel.call(this, evt);
      }
    };

  return events;
};

var activateInput = function (input) {
  input.focus();
  input.select();
};




Template.eventLive.helpers({
	listPosts: function () {
		return Posts.find({eventId: this._id}, { sort: { time: -1 }});
	}, 

	isLive: function () {
		return this.eventIsLive ? "Live" : "Ended";
	}, 

	editing: function() {
		return Session.equals('editing_post_id', this._id);
	}

});

Template.eventLive.events({

	'change #post-upload-file': function (e) {
		var files = e.currentTarget.files;
		_.each(files,function(file){
			var reader = new FileReader;
			var fileData = {
				name:file.name,
				size:file.size,
				type:file.type
			};

		var imageData = 'No data';

		var callback = "postImage";

			//Setting uploading to true.

			Session.set('uploading', true);


			if (!file.type.match(/image.*/)) {
				Session.set('uploading', false);
			}
			else{
				//IMAGE CANVAS

				var img = document.createElement("img");

				reader.onload = function (e) {
					//CANVAS
					img.src = e.target.result;
					var canvas = document.createElement('canvas');
					var ctx = canvas.getContext("2d");





					ctx.drawImage(img, 0, 0);

					var MAX_WIDTH = 400;
					var MAX_HEIGHT = 400;
					var width = img.width;
					var height = img.height;
					 
					if (width > height) {
					  if (width > MAX_WIDTH) {
					    height *= MAX_WIDTH / width;
					    width = MAX_WIDTH;
					  }
					} else {
					  if (height > MAX_HEIGHT) {
					    width *= MAX_HEIGHT / height;
					    height = MAX_HEIGHT;
					  }
					}
					canvas.width = width;
					canvas.height = height;
					var ctx = canvas.getContext("2d");




					

// var exif = EXIF.readFromBinaryFile(new BinaryFile(e.target.result));
// console.log("%O", exif);
// switch(exif.Orientation){

// 	   case 8:
//            ctx.rotate(90*Math.PI/180);
//            break;
//        case 3:
//            ctx.rotate(180*Math.PI/180);
//            break;
//        case 6:
//            ctx.rotate(-90*Math.PI/180);
//            break;

//        case 8:
//            ctx.rotate(90*Math.PI/180);
//            break;
//        case 3:
//            ctx.rotate(180*Math.PI/180);
//            break;
//        case 6:
//            ctx.rotate(-90*Math.PI/180);
//            break;
//     }
					ctx.drawImage(img, 0, 0, width, height);

					var dataUrl = canvas.toDataURL(fileData.type);
					var binaryImg = atob(dataUrl.slice(dataUrl.indexOf('base64')+7,dataUrl.length));
					var length = binaryImg.length;
					var ab = new ArrayBuffer(length);
					var ua = new Uint8Array(ab);
					for (var i = 0; i < length; i++){
						ua[i] = binaryImg.charCodeAt(i);
					}

					//fileData.data = new Uint8Array(reader.result);
					fileData.data = ua;


					Meteor.call("S3upload", fileData, imageData, callback, function(err, url){
						console.log("uploading complete! url is: " + url);
						Session.set('S3url', url);
						Session.set('uploading', false);

						var imageHtml = "<img class=\"img-responsive\" src=\"" + url + "\">";

						document.getElementById('postText').value = imageHtml;



					});
				};

				reader.readAsDataURL(file);
			}
		});
	},
	'click #submitPost' : function (event) {
		event.preventDefault();

		var postText = document.getElementById('postText').value;
		var user = Meteor.user();




		if (postText !== '' && postText !== null) {

			postText = postText.replace(/(www\..+?)(\s|$)/g, function(text, link) {
			   return '<a href="http://'+ link +'">'+ link +'</a>';
			});


			var doc = {
				postText: postText,
				author: user.username,
				eventId: Session.get("currentEvent"),
				time: Date.now(),
			}
			if (user.avatarUrl) { doc["avatarUrl"] = user.avatarUrl; };

			var cmtr = Session.get("commentator");
			if (cmtr !== '' && cmtr !== null) {
				doc["author"] = cmtr;
				doc["avatarUrl"] = Session.get("commentatorAvatarUrl");
			}
					

			Posts.insert(doc);

			document.getElementById('postText').value = '';
			postText.value = '';
			Session.set('commentator', null);
			Session.set('commentatorAvatarUrl', null);
		}
	}, 
		//same as above but for control-enter
	'keyup #postText': function (evt) {
		if (evt.ctrlKey && ( evt.which === 13 || evt.which === 10) ) { 


			var postText = document.getElementById('postText').value;

			postText = postText.replace(/(www\..+?)(\s|$)/g, function(text, link) {
			   return '<a href="http://'+ link +'">'+ link +'</a>';
			});

			var user = Meteor.user();

					if (postText !== '' && postText !== null) {
			var doc = {
				postText: postText,
				author: user.username,
				eventId: Session.get("currentEvent"),
				time: Date.now(),
			}
			if (user.avatarUrl) { doc["avatarUrl"] = user.avatarUrl; };

			var cmtr = Session.get("commentator");
			if (cmtr !== '' && cmtr !== null) {
				doc["author"] = cmtr;
				doc["avatarUrl"] = Session.get("commentatorAvatarUrl");
			}
					

			Posts.insert(doc);

			document.getElementById('postText').value = '';
			postText.value = '';
			Session.set('commentator', null);
			Session.set('commentatorAvatarUrl', null);
		}

		}

	},

	'click .deletePost' : function () {
		Meteor.call("deletePost", this._id);

	},

	'click #liveDead' : function () {
		Meteor.call("liveDead", this._id);

	}, 

////////////events for live editing////////////

	  'click .post': function (evt) {
	    // prevent clicks on <a> from refreshing the page.
	    evt.preventDefault();
	  },
	  'dblclick .post': function (evt, tmpl) { // start editing list name
	    Session.set('editing_post_id', this._id);

	    Deps.flush(); // force DOM redraw, so we can focus the edit field
	    activateInput(tmpl.find("#editPostText"));
	    $(".animated").autosize({append: "\n"});
		$(".animated").trigger('autosize.resize');
	  },
});

Template.eventLive.events(okCancelEvents(
	'#editPostText',
	{
	ok: function (postText) {
	  Posts.update(this._id, {$set: {postText: postText}});
	  Session.set('editing_post_id', null);
	},
	cancel: function () {
	  Session.set('editing_post_id', null);
	}
}));




Template.eventLive.rendered = function () {
	//autoresize the new post and edit post textarea
	$(".animated").autosize({append: "\n"});
	$(".animated").trigger('autosize.resize');


};


