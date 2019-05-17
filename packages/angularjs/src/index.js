import angular from 'angular';
import lws from '@selfkey/lws-js-client';

angular.module('lwsSdk', []).directive('lwsButton', [
	() => {
		return {
			restrict: 'E',
			transclude: true,
			scope: {
				attributes: '=',
				rootEndpoint: '=',
				endpoints: '=',
				extensionId: '=',
				website: '=',
				meta: '=',
				onAuthResponse: '&'
			},

			link: (scope, element) => {
				const handleAuthResponce = (err, res, ui) => {
					scope.onAuthResponse({ err, res, ui });
				};
				lws.init({
					ui: { el: angular.element(element)[0] },
					attributes: scope.attributes,
					website: scope.website,
					extensionId: scope.extensionId,
					rootEndpoint: scope.rootEndpoint,
					endpoints: scope.endpoints,
					meta: scope.meta,
					onAuthResponse: handleAuthResponce
				});
				scope.$on('$destroy', () => {
					lws.teardown();
				});
			}
		};
	}
]);
