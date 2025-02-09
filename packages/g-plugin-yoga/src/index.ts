import type { RendererPlugin, Syringe } from '@antv/g';
import { CSS, Module, PropertySyntax } from '@antv/g';
import { YogaPluginOptions } from './tokens';
import { YogaPlugin } from './YogaPlugin';

const containerModule = Module((register) => {
  register(YogaPlugin);
});

export class Plugin implements RendererPlugin {
  name = 'yoga';

  constructor(private options: Partial<YogaPluginOptions>) {}

  init(container: Syringe.Container): void {
    container.register(YogaPluginOptions, {
      useValue: {
        ...this.options,
      },
    });
    container.load(containerModule, true);

    [
      'top',
      'right',
      'bottom',
      'left',
      'marginAll',
      'marginTop',
      'marginRight',
      'marginBottom',
      'marginLeft',
      'paddingAll',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'minWidth',
      'maxWidth',
      'minHeight',
      'maxHeight',
    ].forEach((name) => {
      CSS.registerProperty({
        name,
        inherits: false,
        initialValue: '0',
        interpolable: true,
        syntax: PropertySyntax.LENGTH_PERCENTAGE,
      });
    });

    ['margin', 'padding'].forEach((name) => {
      CSS.registerProperty({
        name,
        inherits: false,
        initialValue: '0',
        interpolable: true,
        syntax: PropertySyntax.LENGTH_PERCENTAGE_14,
      });
    });

    ['flexGrow', 'flexShrink', 'flexBasis'].forEach((name) => {
      CSS.registerProperty({
        name,
        inherits: false,
        initialValue: '0',
        interpolable: true,
        syntax: PropertySyntax.SHADOW_BLUR,
      });
    });
  }
  destroy(container: Syringe.Container): void {
    container.remove(YogaPluginOptions);
    container.unload(containerModule);

    // TODO: unregister CSS properties
  }
}
