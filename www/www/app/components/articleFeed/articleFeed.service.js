;
(function () {

  angular
    .module('drupalionicDemo.articleFeed.service', ['d7-services.resources.comment.resource'])
    .factory('ArticleFeedService', ArticleFeedService);

  ArticleFeedService.inject = ['$q', '$filter', 'DrupalApiConstant', 'DrupalHelperService', 'ViewsResource', 'FileResource','CommentResource', 'NodeResource', 'AuthenticationService']

  function ArticleFeedService($q, $filter, DrupalApiConstant, DrupalHelperService, ViewsResource, FileResource, CommentResource, NodeResource, AuthenticationService) {

    var initialised = false,

    //pagination options
      paginationOptions = {};
    paginationOptions.pageFirst = 0;
    paginationOptions.pageLast = undefined;
    paginationOptions.maxPage = undefined;

    //Options for indexing nodes
    var viewsOptions = {};
    viewsOptions.view_name = 'testview';
    viewsOptions.page = 0;
    viewsOptions.pagesize = 25;
    viewsOptions.format_output = '0';

    //stored article
    var articles = [];

    //articleFeed service object
    var articleFeedService = {
      init: init,
      getAll: getAll,
      get: get,
      loadRecent: loadRecent,
      loadMore: loadMore,
      saveArtilce: saveArtilce,
      deleteArticle: deleteArticle,
      loadComments : loadComments,
      createComment : createComment

    }

    return articleFeedService;

    /////////////////////////////////////////////////////////////

    function init() {
      var defer = $q.defer();

      retreiveArticles(viewsOptions)
        .then(
        //success
        function (newArticles) {
          defer.resolve(articles);
        }
      )
        .catch(
        function (error) {
          defer.reject(error);
        }
      )
        .finally(
        function () {
          initialised = true;
        }
      );

      return defer.promise;
    }


    //prepare article after fetched from server
    function prepareArticle(article) {
      if("field_image" in article && "und" in article.field_image) {
       angular.forEach(article.field_image.und, function (value, key) {

         var imgPath = article.field_image.und[key].uri.split('//')[1].replace(/^\/+/, "");
         article.field_image.und[key].imgPath = DrupalHelperService.getPathToImgByStyle(DrupalApiConstant.imageStyles.medium) + imgPath;
         article.nid = parseInt(article.nid);
       });

     }

     return article;
    }

    //returns all articles
    //@TODO implement exposed filters for request and cache like in get
    function getAll() {
      var defer = $q.defer(),
        allFilteredSpots = undefined;

      if (articles.length > 0) {
        allFilteredSpots = articles;
      } else {
        allFilteredSpots = undefined;
      }

      if (allFilteredSpots != undefined) {
        defer.resolve(allFilteredSpots);
      }
      else {
        return retreiveArticles(viewsOptions);
      }

      return defer.promise;
    }

    //returns article by nid
    // first it query's the cache
    // if item not in cache it fires request to server
    //filter { nid:3 }
    function get(filter) {

      var defer = $q.defer(),
        article = undefined;

      //if a filter is given and not empty
      if (angular.isObject(filter) && typeof Object.keys(filter)[0] !== 'undefined') {
        article = $filter('filter')(articles, filter)
        if (article.length > 0) {
          article = article[0];
        }
      }

      //return article form cache
      if (angular.isObject(article) && typeof Object.keys(article)[0] !== 'undefined') {
        defer.resolve(article);
      }
      else {
        //setup exposed filters options
        viewsOptions.exposed_filters = filter;

        return ViewsResource
          .retrieve(viewsOptions)
          .then(function (result) {
            if (result.data[0]) {
              return result.data[0];
            }
            return $q.reject(false);
          });
      }

      return defer.promise;
    }

    //loads recent articles and adds to articles array
    function loadRecent() {
      if (paginationOptions.pageFirst > 0) {
        paginationOptions.pageFirst = 0;
      }
      viewsOptions.page = paginationOptions.pageFirst;

      return retreiveArticles(viewsOptions);
    }

    //loads articles and adds to articles array
    function loadMore() {
      var defer = $q.defer();

      if (paginationOptions.maxPage === undefined) {
        //start initial with 0
        paginationOptions.pageLast = (paginationOptions.pageLast === undefined) ? 0 : paginationOptions.pageLast + 1,
          viewsOptions.page = paginationOptions.pageLast;

        return retreiveArticles(viewsOptions);
      }
      //no more nodes to load
      else {
        defer.resolve(articles);
      }

      return defer.promise;
    }

    //retrieves articles from view and handle pagination
    function retreiveArticles(viewsOptions) {
      paginationOptions.pageLast = (paginationOptions.pageLast === undefined) ? 0 : paginationOptions.pageLast;

      var defer = $q.defer();
      ViewsResource
        .retrieve(viewsOptions)
        .then(
        function (response) {
          if (response.data.length != 0) {
            articles = mergeItems(response.data, articles, undefined, prepareArticle);
          }

          if (response.data.length == 0) {
            viewsOptions.page--;
            paginationOptions.pageLast = viewsOptions.page;
            paginationOptions.maxPage = viewsOptions.page;
          }

          defer.resolve(articles);
        }
      )
        .catch(
        function (error) {
          defer.reject(error);
        }
      );

      return defer.promise;

    }

    //saves article and optional image
    //returns promise
    function saveArtilce(article) {

      var preparedArticle = angular.merge({}, article);

      var field_biz_geocodeData = {
        bottom : "48.193302200000",
        geo_type : "point",
        geohash : "u2ed5v743dstd",
        geom : "POINT (16.3408603 48.1933022)",
        lat: "48.193302200000",
        left: "16.340860300000",
        lon: "16.340860300000",
        right: "16.340860300000",
        top: "48.193302200000"
      };

      preparedArticle.field_biz_geocodeData = DrupalHelperService.structureField(field_biz_geocodeData);


      return trySaveOptionalImage()
        .then(
        function (result) {
          preparedArticle.field_image = DrupalHelperService.structureField({fid: result.data.fid});
        },
        function (error) {
          //resolve without image
          return $q.resolve(true);
        }
      )
        .finally(
        function () {
          return NodeResource.create(preparedArticle);
        }
      );

      ///////////


      //returns promise
      // - resolve after saved image to server
      // - rejects if saving image fails or no image given
      function trySaveOptionalImage() {
        //if data is given
        if (preparedArticle.field_image.base64) {

          var imgData = preparedArticle.field_image.base64;
          delete preparedArticle.field_image.base64;

          var newImage = {};

          newImage.file = imgData;
          newImage.filename = 'drupal.jpg';
          newImage.filesize = newImage.file.length;
          newImage.filepath = 'field/image/';
          newImage.filemime = "image/jpeg",
            newImage.image_file_name = 'drupal.jpg';

          return FileResource.create(newImage);
        }

        //else fail
        return $q.reject(false);

      }

    }

    function deleteArticle(article) {
      return NodeResource.delete(article);
    }

    function mergeItems(newItems, currentItems , type, callback) {

      callback = (typeof(callback) === "function")?callback:function(obj) {return obj;};

      if(!type) {
        var uniqueNodes = [];
        var isUnique;
        angular.forEach(newItems, function(newItems) {
          isUnique = true;
          angular.forEach(currentItems, function(currentItem, key) {
            if(newItems.nid == currentItem.nid) { isUnique = false; }
          }, isUnique);

          if(isUnique) {
            uniqueNodes.push(callback(newItems));
          }
        }, uniqueNodes);

        currentItems =  uniqueNodes.concat(currentItems);

        return currentItems;
      }
      else {
        angular.forEach(newItems, function(newItem) {
          //@TODO add this to if => || currentItems[newItem[type]].updated > newItem.updated
          if(!currentItems[newItem[type]] ) {
            currentItems[parseInt(newItem[type])] = callback(newItem);
          }

        });
        return currentItems;
      }
    };

    function loadComments(nid){
     var defered = $q.defer();

      var data = {
        nid : nid
      };
      NodeResource
        .comments(data)
          .then(
            function(response) {

              var commentsData = response.data;
              defered.resolve(prepareComments(commentsData));
           },
           function(error) {
             defered.reject(error);
           }
        );

      return defered.promise;
    }

    //@TODO prepare image paths
    function prepareComments(data) {
      return data;
    }

    function createComment(nid, commentData) {
      commentData.nid = nid;

      commentData.comment_body = DrupalHelperService.structureField({"value": commentData.comment_body_value});
      commentData.field_rating = DrupalHelperService.structureField({"rating": commentData.rating});


      delete commentData.comment_body_value;

      return CommentResource
        .create(commentData)
        .then(
          function(respones){
            return $q.resolve(respones.data.nid);
          }
        );
    }

  }


})();
