;
(function () {

  angular
    .module('drupalionicDemo.articleFeed.articleDetail.controller', ['drupalionicDemo.articleFeed.service'])
    .controller('ArticleDetailController', ArticleDetailController);

  ArticleDetailController.$inject = ['$scope', '$stateParams', 'UserResource', 'NodeResource', 'DrupalHelperService', 'ArticleFeedService','articleDetail']

  function ArticleDetailController($scope, $stateParams, UserResource, NodeResource, DrupalHelperService, ArticleFeedService, articleDetail) {

    var vm = this;

    vm.viewTitle = $stateParams.title;
    vm = angular.extend(vm, articleDetail);
    vm.pathToImg = false;

    vm.loadingComments = false;
    vm.savingNewComment = false;
    vm.newCommentData = {};

    //vm.user = undefined;
    vm.pathToUserImg = false;

    //vm.comments = [];

    vm.pathToImg = (articleDetail.field_image.und) ? DrupalHelperService.getPathToImgByStyle('large') + articleDetail.field_image.und[0].uri.split('//')[1] : false;

    /*if(vm.article.uid) {
     UserResource.retrieve(vm.article.uid).then(
       function(user) {
       if(user.picture !== null && user.picture.filename !== null) {
       vm.user = user;
       vm.pathToUserImg = vm.pathToCms + '/sites/default/files/styles/thumbnail/public/pictures/' + user.picture.filename;
       }
     },
     //error loading user
     function() {}
     );
     }*/


    vm.loadComments = function () {
     vm.loadingComments = true;
       ArticleFeedService
         .loadComments(vm.nid)
          .then(
            function(newComments) {
              vm.comments = newComments;
            }
          )
         .finally(function() {
           vm.loadingComments = false;
         });
     }

     vm.createComment = function() {

       //@TODO create images and rating data here
       //for now rating is static in articleService
       ArticleFeedService
         .createComment(vm.nid, vm.newCommentData)
         .finally(function() {
           vm.savingNewComment = false;
         });
     }

  };

})();


