;
(function () {
  'use strict';


  angular
    .module('drupalionicDemo.config', ['d7-services.commons.configurations', 'd7-services.commons.http.configurations'])
    .config(configFunction);

  configFunction.$inject = ['DrupalApiConstant'];

  /** @ngInject */
  function configFunction(DrupalApiConstant) {
    //drupal services configurations

    console.log(DrupalApiConstant.drupal_instance);
    DrupalApiConstant.api_endpoint = DrupalApiConstant.api_endpoint+'v1/';
  };

})();
