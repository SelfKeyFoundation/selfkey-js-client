import angular from 'angular';
import lws from 'lws-js-client';

angular.module('lwsSdk', []).directive('lwsButton', [
	() => {
		return {
			restrict: 'E',
			transclude: true,
			scope: {
				attributes: '=',
				website: '=',
				onAuthResponse: '&'
			},

			link: (scope, element, attrs) => {
				const handleAuthResponce = (err, res) => {
					scope.onAuthResponse({ err, res });
				};
				lws.init({
					el: angular.element(element)[0],
					attributes: scope.attributes,
					website: scope.website,
					onAuthResponse: handleAuthResponce
				});
				scope.$on('$destroy', () => {
					lws.teardown();
				});
			}
		};
	}
]);
