var request = require('request');
var _ = require('lodash');
var cookie_header = require('../cookie.json');
var query_id = require('./const.json');

var headers = 
/*_.each(tmp.request.headers, function(val) {
	var t = {};
	return headers[val.name] = val.value;
});
*/

module.exports = function() {

	function _get(url, callback) {
		console.log(url);
		request.get({
			url: url,
			httpVersion: "HTTP/1.1",
			headers: cookie_header,
			gzip: true,
		}, function(err, resp, body) {
			callback(JSON.parse(body));
		});
	}

	function _post(url, data, callback) {
		var h = _.cloneDeep(cookie_header);

		if (data.header !== undefined) {
			_.each(data.header, function(value, key) {
				h[key] = value;
			})
		}
		console.log(url, data.data);
		request.post({
			url: url,
			headers: h,
			gzip: true,
			body: data.data,
		}, function(err, resp, body) {
			callback(JSON.parse(body));
		});
	}

	this.getHome = function(next_page, callback) {
		if (next_page) {
			var url = "https://www.instagram.com/graphql/query/?query_id="+query_id.home_paging+"&fetch_media_item_count=100&fetch_media_item_cursor="+next_page+"&fetch_comment_count=0&fetch_like=0";
			_get(url, function(json) {
				callback(json);
			});
		} else {
			var url = "https://www.instagram.com/?__a=1";
			_get(url, function(json) {
				callback(json);
			});
		}
	}

	this.getOne = function(id, callback) {
		var url = "https://www.instagram.com/p/" + id + "?__a=1";
		_get(url, function(json) {
			callback(json);
		});
	}
	
	this.getUserInfo = function(username, callback) {
		var url = "https://www.instagram.com/" + username + "?__a=1";
		_get(url, function(json) {
			callback(json);
		});
	}

	this.getUserFeed = function(user_id, next_page, callback) {
		var url = "https://www.instagram.com/graphql/query/?query_id=" +query_id.user_paging+ "&id=" + user_id + "&first=500&after=" + next_page;
		_get(url, function(json) {
			callback(json);
		});
	}

	this.search = function(keyword, callback) {

		var url = "https://www.instagram.com/web/search/topsearch/?context=blended&rank_token=0.9390493603218828&query="+encodeURIComponent(keyword);
		_get(url, function(json) {
			callback(json);
		})
	}

	this.searchHashtag = function(hashtag, paging, callback) {
		if (paging) {
			var url = "https://www.instagram.com/query/";
			var post = "q=ig_hashtag("+hashtag+"){media.after("+paging+",100){count,nodes{__typename,caption,code,comments{count},comments_disabled,date,dimensions{height,width},display_src,id,is_video,likes{count},owner{id},thumbnail_src,video_views},page_info}}";
			var header = {
				"Referer": "https://www.instagram.com/explore/tags/"+hashtag+"/",
				"content-type" : "application/x-www-form-urlencoded",
			}
			_post(url, {data: post, header: header}, function(json) {
				callback(json);
			});
		} else {
			var url = "https://www.instagram.com/explore/tags/"+hashtag+"/?__a=1";
			_get(url, function(json) {
				callback(json);
			})
		}
	}

	
}
