;
(function () {
  'use strict';


  angular
    .module('drupalionicDemo.register.controller', ['commons.validation.setValidAfterChange', 'ngStorage', 'ngMessages'])
    .controller('RegisterController', RegisterController);

  RegisterController.$inject = ['$scope', 'UserResource', 'AuthenticationService', '$localStorage'];

  /** @ngInject */
  function RegisterController($scope, UserResource, AuthenticationService, $localStorage) {
    // jshint validthis: true
    var vm = this;

    //data for vm.registerForm
    //vm.registerData = {
    //  name: 'demo-user',
    //  mail: 'click2tman+demo-user@gmail.com',
    //  pass: 'demo-user',
    //  field_user_nickname: 'Demo Nickname'
    //};

    vm.registerIsPending = false;

    vm.goToLogin = goToLogin;
    vm.doRegister = doRegister;

    /////////////

    function goToLogin() {
      $scope.app.resetForm(vm.registerForm);
      $scope.app.$state.go('app.login');
    }

    function doRegister() {

      //$scope.app.resetForm(vm.registerForm);

      if (vm.registerForm.$valid) {
        vm.registerIsPending = true;

        //vm.registerData.field_user_phone = DrupalHelperService.structureField();
        console.log(vm.registerData);
        UserResource.register(vm.registerData)
          //register
          .then(
          function (data) {
            $localStorage.isRegistered = true;
            return AuthenticationService.login({username: vm.registerData.name, password: vm.registerData.pass});
          }
        )
          //login
          .then(
          function (data) {
            console.log(data);
            vm.registerIsPending = false;
            //reset form
            vm.registerData = {};

            //reste form
            $scope.app.resetForm(vm.registerForm);
            $scope.app.$state.go('app.login');
          }
        )
          .catch(
          function (errorResult) {
            vm.registerServerErrors = errorResult.data.form_errors;

            if (errorResult.data.form_errors.name) {
              vm.registerForm.name.$setValidity('name-taken', false);
            }
            if (errorResult.data.form_errors.mail) {
              vm.registerForm.mail.$setValidity('email-taken', false);
            }

          }
        )
        .finally(
          function () {
            vm.registerIsPending = false;
          }
        );
      }

    };


  };

})();
