import { FB_MARKETPLACE_TOOL_DEFINITION } from '../src/skill/index.js';

console.log('🧪 Testing FB Marketplace Skill Tool Definition...');

if (
  FB_MARKETPLACE_TOOL_DEFINITION.name === 'fb_marketplace_optimizer' &&
  FB_MARKETPLACE_TOOL_DEFINITION.parameters.properties.action.enum.length === 6
) {
  console.log('✅ Skill Tool Schema is valid!');
  console.log('Available Actions:', FB_MARKETPLACE_TOOL_DEFINITION.parameters.properties.action.enum);
} else {
  console.error('❌ Invalid Skill Tool Schema');
  process.exit(1);
}
