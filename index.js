var express = require('express');
var app = express();
var api = require('./api/instagram_api.js');
var app_api = new api();
var _ = require('lodash');

app.use('/static', express.static(__dirname + '/public'));


app.get('/', function(req, res) {
	app_api.getHome(req.query.next_page, function(json) {
		if (_.get(req, "query.json") === "1") return res.send(json);
		var html = "";
		var timeline = _.get(json, "graphql.user.edge_web_feed_timeline", 
			_.get(json, "data.user.edge_web_feed_timeline", []));

		_.each(timeline.edges, function(item) {
			html += renderPost(item.node);
		})
		html += "<div class=\"paging\"><a href=\"/?next_page="+timeline.page_info.end_cursor+"\">next page</a></div>";
		res.send(displayPage(html));
	});
});

app.get('/show_one', function(req, res) {
	app_api.getOne(req.query.id, function(json) {
		if (_.get(req, "query.json") === "1") return res.send(json);
		var html = "";
		html += renderOne(json.graphql.shortcode_media);
		res.send(displayPage(html));
	});
});

app.get('/user_info', function(req, res) {
	if (_.get(req, "query.user_id", false) !== false) {
		app_api.getUserFeed(req.query.user_id, req.query.next_page, function(json) {
			if (_.get(req, "query.json") === "1") return res.send(json);

			var html = "<h1>user("+json.data.user.edge_owner_to_timeline_media.count+")</h1>";
			_.each(_.get(json, "data.user.edge_owner_to_timeline_media.edges", []), function(item) {
				html += renderPost(item.node);
			});
			if (json.data.user.edge_owner_to_timeline_media.page_info.has_next_page === true) {
				html += "<div class=\"paging\"><a href=\"/user_info?user_id="+req.query.user_id+"&next_page="+json.data.user.edge_owner_to_timeline_media.page_info.end_cursor+"\">next page</a></div>";
			}

			res.send(displayPage(html));
		});
	} else {
		app_api.getUserInfo(req.query.username, function(json) {
			if (_.get(req, "query.json") === "1") return res.send(json);

			var html = "<h1>user</h1>";
			_.each(_.get(json, "user.media.nodes", []), function(item) {
				html += renderPost(item);
			});
			if (json.user.media.page_info.has_next_page === true) {
				html += "<div class=\"paging\"><a href=\"/user_info?user_id="+json.user.id+"&next_page="+json.user.media.page_info.end_cursor+"\">next page</a></div>";
			}
			res.send(displayPage(html));
		});	
	}
});

app.get('/search', function(req, res) {
	if (_.get(req, "query.search")) {
		app_api.search(req.query.search, function(json) {
			if (_.get(req, "query.json") === "1") return res.send(json);

			html = "";
			if (req.query.search.substr(0, 1) === "#") {
				_.each(json.hashtags, function(tag) {
					html += renderSearchTag(tag.hashtag);
				})
			} else {
				_.each(json.users || [], function(user) {
					html += renderSearchUser(user.user);
				})
			}
			res.send(displayPage(html));
		});
	} else {
		res.send(displayPage(""));
	}
});

app.get('/hashtag', function(req, res) {
	app_api.searchHashtag(req.query.hashtag, req.query.next_page || null, function(json) {
		if (_.get(req, "query.json") === "1") return res.send(json);

		html = "<h1>top post</h1>";
		var medias = _.get(json, "tag.media", json.media);
		var top_posts = _.get(json, "tag.top_posts");
		if (top_posts) {
			_.each(top_posts.nodes, function(media) {
				html += renderUserPost(media);
			})
		}
		html += "<h1>users</h1>";
		_.each(medias.nodes, function(media) {
			html += renderUserPost(media);
		});
		if (medias.page_info.has_next_page === true) {
			html += "<div class=\"paging\"><a href=\"/hashtag?hashtag="+req.query.hashtag+"&next_page="+medias.page_info.end_cursor+"\">next page</a></div>";
		}
		res.send(displayPage(html));
	});
})


app.listen(3333);


function displayPage(html) {
	var result = "";
	result += "<link rel=\"stylesheet\" href=\"/static/font/css/font-awesome.css\" />"
	result += "<link rel=\"stylesheet\" href=\"/static/style.css\" />"
	result += "<form method=\"get\" action=\"/search\" style=\"width: 100%; clear:both;\" ><a href=\"/\">Home</a> | <input name=\"search\" type=\"text\" />";
	result += "<input type=\"submit\" /></form><hr>"+html;
	return "<div  style=\"width: 100%; clear:both;\">"+result+"</div>";
}

function renderOne(node) {
	html = "<img src=\""+node.owner.profile_pic_url+"\" class=\"small-profile\"/><a href=\"/user_info?user_id="+node.owner.id+"&next_page=\">"+node.owner.username+" ("+node.owner.full_name+")</a>";
	html += "<hr>"+_.get(node, "edge_media_to_caption.edges[0].node.text")+"<BR>";
	if (node.edge_sidecar_to_children !== undefined) {
		_.each(_.get(node, "edge_sidecar_to_children.edges"), function(n) {
			if (n.node.video_url !== undefined) {
				html += "<video controls poster=\""+n.node.display_url+"\" preload=\"none\" src=\""+n.node.video_url+"\" type=\"video/mp4\"></video>";
			} else {
				html += "<img src=\""+n.node.display_url+"\"/>";
			}
		});
	} else {
		if (node.video_url !== undefined) {
			html += "<video controls poster=\""+node.display_url+"\" preload=\"none\" src=\""+node.video_url+"\" type=\"video/mp4\"></video>"
		} else {
			html += "<img src=\""+node.display_url+"\"/>";
		}
	}

	html += "<div>like: "+node.edge_media_preview_like.count+"</div>";

	_.each(node.edge_media_to_comment.edges, function(cmd) {
		html += "<div class=\"commend\"><img src=\""+cmd.node.owner.profile_pic_url+"\" class=\"small-profile\"/><a href=\"/user_info?next_page=&user_id="+cmd.node.owner.id+"\">"+cmd.node.owner.username+"</a> - "+cmd.node.text+"</div>";
	});

	html += "<hr><h1>relate</h1>";

	_.each(_.get(node, "edge_web_media_to_related_media.edges"), function(relate) {
		html += "<div class=\"img-item\"><a href=\"/show_one?id="+relate.node.shortcode+"\" target=\"_blank\"><img src=\""+relate.node.thumbnail_src+"\"/></a></div>";
	})

	return html;
}

function renderPost(node) {
	var html = "";
	if (_.get(node, "owner.username")) {
		html += "<a href=\"user_info?username="+node.owner.username+"\">"+node.owner.username+"</a><br>";
	}
	var thumb = node.thumbnail_src !== undefined ? node.thumbnail_src : (
		node.display_url ? node.display_url : node.display_src
	);
	var video = node.is_video ? "<i class=\"fa fa-play\" aria-hidden=\"true\"></i>" : "";
	var code = node.shortcode !== undefined ? node.shortcode : node.code;

	html += "<a href=\"/show_one?id="+code+"\" target=\"_blank\">";
	html += "<img src=\""+thumb+"\" height=\"200\" />"+video+"</a><br>";
	return "<div class=\"img-item\">"+html+"</div>";
}

function renderUserPost(node) {
	var html = "";
	var video = node.is_video ? "<i class=\"fa fa-play\" aria-hidden=\"true\"></i>" : "";

	html += "<a href=\"/user_info?user_id="+node.owner.id+"&next_page=\" target=\"_blank\"><br>";
	html += "<img src=\""+node.display_src+"\" height=\"200\" />"+video+"</a>";
	return "<div class=\"img-item\">"+html+"</div>";
}

function renderSearchUser(node) {
	var html = "";
	html += "<a href=\"/user_info?username="+node.username+"\">"+node.username;
	html += "<BR><img src=\""+node.profile_pic_url+"\" height=\"150\"/></a>";
	return "<div class=\"img-item\">"+html+"</div>";
}

function renderSearchTag(node) {
	var html = "";
	html += "<a href=\"/hashtag?hashtag="+node.name+"\">"+node.name+"<br>("+node.media_count+")</a>";
	return "<div style=\"width:150px; height:100px; float:left;\">"+html+"</div>";
}

function renderHashtag(node) {

}

console.log('go to localhost:3333');
