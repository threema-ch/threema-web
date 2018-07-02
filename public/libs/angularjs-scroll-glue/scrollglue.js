/* angularjs Scroll Glue
 * version 2.1.0
 * https://github.com/Luegg/angularjs-scroll-glue
 * An AngularJs directive that automatically scrolls to the bottom of an element on changes in it's scope.
*/

// Allow module to be loaded via require when using common js. e.g. npm
if(typeof module === "object" && module.exports){
    module.exports = 'luegg.directives';
}

(function(angular, undefined){
    'use strict';

    function createActivationState($parse, attr, scope){
        var activated = true;
        return {
            getValue: function(){
                return activated;
            },
            setValue: function(value){
                activated = value;
            }
        };
    }

    function createDirective(module, attrName, direction){
        module.directive(attrName, ['$parse', '$window', '$timeout', function($parse, $window, $timeout){
            return {
                priority: 1,
                restrict: 'A',
                link: function(scope, $el, attrs){
                    const el = $el[0];
                    const activationState = createActivationState($parse, attrs[attrName], scope);

                    function scrollIfGlued() {
                        console.warn('scrollifglued');
                        const active = activationState.getValue();
                        const attached = direction.isAttached(el);
                        if (active && !attached){
                            direction.scroll(el);
                        } else {
                            if (!active) {
                                console.warn('  nope (inactive)');
                            } else if (attached) {
                                console.warn('  nope (attached)');
                            } else {
                                console.warn('  nopeeeeeee?!');
                            }
                        }
                    }

                    function onScroll() {
                        activationState.setValue(direction.isAttached(el));
                    }

                    scope.$watch(() => {
                        const ctx = this;
                        if (ctx.watchPromise === undefined) {
                            ctx.watchPromise = $timeout(() => {
                                scrollIfGlued();
                                ctx.watchPromise = undefined;
                            }, 10, false);
                        }
                    });

                    $timeout(scrollIfGlued, 0, false);

                    $window.addEventListener('resize', scrollIfGlued, false);

                    $el.on('scroll', onScroll);


                    // Remove listeners on directive destroy
                    $el.on('$destroy', function() {
                        $el.unbind('scroll', onScroll);
                    });

                    scope.$on('$destroy', function() {
                        $window.removeEventListener('resize', scrollIfGlued, false);
                    });
                }
            };
        }]);
    }

    var bottom = {
        isAttached: function(el){
            // + 1 catches off by one errors in chrome
            return el.scrollTop + el.clientHeight + 1 >= el.scrollHeight;
        },
        scroll: function(el){
            console.warn('  scroll');
            el.scrollTop = el.scrollHeight;
        }
    };

    var module = angular.module('luegg.directives', []);

    createDirective(module, 'scrollGlue', bottom);
}(angular));
