#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');

function validateFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return { valid: false, error: 'Missing YAML frontmatter' };
  }

  const frontmatter = frontmatterMatch[1];
  const hasName = /^name:\s*.+$/m.test(frontmatter);
  const hasDescription = /^description:\s*.+$/m.test(frontmatter);

  if (!hasName) {
    return { valid: false, error: 'Missing "name" in frontmatter' };
  }
  if (!hasDescription) {
    return { valid: false, error: 'Missing "description" in frontmatter' };
  }

  return { valid: true };
}

function validateSkill(skillPath) {
  const skillName = path.basename(skillPath);
  const skillMdPath = path.join(skillPath, 'SKILL.md');

  console.log(`\nValidating skill: ${skillName}`);

  // Check SKILL.md exists
  if (!fs.existsSync(skillMdPath)) {
    console.error(`  ✗ Missing SKILL.md`);
    return false;
  }
  console.log(`  ✓ SKILL.md exists`);

  // Validate frontmatter
  const content = fs.readFileSync(skillMdPath, 'utf-8');
  const frontmatterResult = validateFrontmatter(content);
  if (!frontmatterResult.valid) {
    console.error(`  ✗ ${frontmatterResult.error}`);
    return false;
  }
  console.log(`  ✓ Valid frontmatter (name + description)`);

  // Check for references (optional but log if present)
  const referencesPath = path.join(skillPath, 'references');
  if (fs.existsSync(referencesPath)) {
    const refs = fs.readdirSync(referencesPath);
    console.log(`  ✓ References: ${refs.join(', ')}`);
  }

  // Check for scripts (optional but log if present)
  const scriptsPath = path.join(skillPath, 'scripts');
  if (fs.existsSync(scriptsPath)) {
    const scripts = fs.readdirSync(scriptsPath);
    console.log(`  ✓ Scripts: ${scripts.join(', ')}`);
  }

  return true;
}

function main() {
  console.log('Validating Agent Skills...');
  console.log('='.repeat(40));

  if (!fs.existsSync(SKILLS_DIR)) {
    console.error('Error: skills/ directory not found');
    process.exit(1);
  }

  const skills = fs.readdirSync(SKILLS_DIR).filter(f => {
    const stat = fs.statSync(path.join(SKILLS_DIR, f));
    return stat.isDirectory();
  });

  if (skills.length === 0) {
    console.error('Error: No skills found in skills/ directory');
    process.exit(1);
  }

  let allValid = true;
  for (const skill of skills) {
    const isValid = validateSkill(path.join(SKILLS_DIR, skill));
    if (!isValid) allValid = false;
  }

  console.log('\n' + '='.repeat(40));
  if (allValid) {
    console.log('✓ All skills are valid!');
    process.exit(0);
  } else {
    console.error('✗ Some skills have errors');
    process.exit(1);
  }
}

main();
