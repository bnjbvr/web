class ComponentView {

  constructor(componentManager, $timeout) {
    this.restrict = "E";
    this.templateUrl = "directives/component-view.html";
    this.scope = {
      component: "=",
      manualDealloc: "="
    };

    this.componentManager = componentManager;
    this.timeout = $timeout;
  }

  link($scope, el, attrs, ctrl) {
    $scope.el = el;

    $scope.identifier = "component-view-" + Math.random();

    // console.log("Registering handler", $scope.identifier, $scope.component.name);

    this.componentManager.registerHandler({identifier: $scope.identifier, areas: [$scope.component.area], activationHandler: (component) => {
      if(component.active) {
        this.timeout(() => {
          var iframe = this.componentManager.iframeForComponent(component);
          if(iframe) {
            iframe.onload = function() {
              this.componentManager.registerComponentWindow(component, iframe.contentWindow);
            }.bind(this);
          }
        });
      }
    },
    actionHandler: (component, action, data) => {
       if(action == "set-size") {
         this.componentManager.handleSetSizeEvent(component, data);
       }
    }});

    $scope.$watch('component', function(component, prevComponent){
      ctrl.componentValueChanging(component, prevComponent);
    });
  }

  controller($scope, $timeout, componentManager, desktopManager) {
    'ngInject';

    this.componentValueChanging = (component, prevComponent) => {
      if(prevComponent && component !== prevComponent) {
        // Deactive old component
        componentManager.deactivateComponent(prevComponent);
      }

      if(component) {
        componentManager.activateComponent(component);
        console.log("Loading", $scope.component.name, $scope.getUrl(), component.valid_until);

        $scope.reloadStatus();
      }
    }

    $scope.reloadStatus = function() {
      let component = $scope.component;
      $scope.reloading = true;
      let previouslyValid = $scope.componentValid;

      $scope.offlineRestricted = component.offlineOnly && !isDesktopApplication();

      $scope.componentValid = !$scope.offlineRestricted && (!component.valid_until || (component.valid_until && component.valid_until > new Date()));

      if($scope.componentValid !== previouslyValid) {
        if($scope.componentValid) {
          componentManager.activateComponent(component);
        }
      }

      $timeout(() => {
        $scope.reloading = false;
      }, 500)
    }

    $scope.getUrl = function() {
      var url = componentManager.urlForComponent($scope.component);
      $scope.component.runningLocally = url !== ($scope.component.url || $scope.component.hosted_url);
      return url;
    }

    $scope.$on("$destroy", function() {
      // console.log("Deregistering handler", $scope.identifier, $scope.component.name);
      componentManager.deregisterHandler($scope.identifier);
      if($scope.component && !$scope.manualDealloc) {
        componentManager.deactivateComponent($scope.component);
      }
    });
  }

}

angular.module('app').directive('componentView', (componentManager, $timeout) => new ComponentView(componentManager, $timeout));