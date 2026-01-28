#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const SKILLS_DIR = path.join(ROOT_DIR, 'skills');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function getSkillMetadata(skillPath) {
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  const content = fs.readFileSync(skillMdPath, 'utf-8');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) return {};

  const frontmatter = frontmatterMatch[1];
  const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim();

  return { name, description };
}

function main() {
  console.log('Building Agent Skills Package...');
  console.log('='.repeat(40));

  // Validate first
  console.log('\n1. Running validation...');
  try {
    execSync('node scripts/validate.js', { cwd: ROOT_DIR, stdio: 'inherit' });
  } catch (e) {
    console.error('Build failed: validation errors');
    process.exit(1);
  }

  // Clean dist
  console.log('\n2. Cleaning dist/...');
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
  console.log('  ✓ dist/ cleaned');

  // Copy skills
  console.log('\n3. Copying skills...');
  const skillsDest = path.join(DIST_DIR, 'skills');
  copyRecursive(SKILLS_DIR, skillsDest);
  console.log('  ✓ Skills copied to dist/skills/');

  // Generate manifest
  console.log('\n4. Generating manifest...');
  const skills = fs.readdirSync(SKILLS_DIR).filter(f => {
    return fs.statSync(path.join(SKILLS_DIR, f)).isDirectory();
  });

  const manifest = {
    name: 'dynamodb-toolbox-skill',
    version: require(path.join(ROOT_DIR, 'package.json')).version,
    skills: skills.map(skillName => {
      const metadata = getSkillMetadata(path.join(SKILLS_DIR, skillName));
      return {
        name: metadata.name || skillName,
        description: metadata.description || '',
        path: `skills/${skillName}`
      };
    })
  };

  fs.writeFileSync(
    path.join(DIST_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('  ✓ manifest.json generated');

  // Summary
  console.log('\n' + '='.repeat(40));
  console.log('Build complete!');
  console.log(`\nPackage contents:`);
  console.log(`  - ${manifest.skills.length} skill(s)`);
  manifest.skills.forEach(s => {
    console.log(`    • ${s.name}: ${s.description.slice(0, 50)}...`);
  });
  console.log(`\nOutput: dist/`);
}

main();
