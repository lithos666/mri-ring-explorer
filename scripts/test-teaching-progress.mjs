import assert from 'node:assert/strict';
import {TEACHING_ID, TEACHING_STAGE_COUNT, initialProgress, teachingSteps, validateProgress, validateStoredIds} from '../lib/teaching.ts';

const progress=(currentStep,stepOrderVersion,completedStepIds=[])=>({schemaVersion:1,tutorialId:TEACHING_ID,currentStep,stepOrderVersion,currentRing:10,completedStepIds});
assert.equal(TEACHING_STAGE_COUNT,10);
assert.equal(initialProgress().stepOrderVersion,3);
// Retain semantic locations for participants returning from either published
// nine-stage order, including the original rods-before-frame sequence.
for(const [previous,current] of [[1,1],[2,2],[3,3],[4,6],[5,4],[6,7],[7,8],[8,9],[9,10]]){
 const migrated=validateProgress(progress(previous,2));
 assert.equal(migrated.currentStep,current,`Version 2 stage ${previous}`);
 assert.equal(migrated.currentRing,10);
 assert.equal(migrated.stepOrderVersion,3);
}
for(const [previous,current] of [[7,10],[8,8],[9,9]])assert.equal(validateProgress(progress(previous,undefined)).currentStep,current,`Original order stage ${previous}`);
const oldComplete=['step-01','step-02','step-03','step-04','step-05','step-06','step-07','step-08','step-09','step-10','step-01','unknown'];
assert.deepEqual(validateProgress(progress(4,2,oldComplete)).completedStepIds,['step-01','step-02','step-03','step-06','step-07','step-08','step-09'],'Changed acrylic/cap stages and the new clip stage must be checked again');
const currentComplete=teachingSteps.map(step=>step.id);
assert.deepEqual(validateProgress(progress(10,3,currentComplete)).completedStepIds,currentComplete);
assert.equal(validateProgress(progress(10,3)).currentStep,10,'The tenth stage must survive reload');
assert.equal(validateProgress(progress(99,3)).currentStep,1);
assert.equal(validateProgress({...progress(5,3),tutorialId:'other'}),null);
const allowedChecks=new Set(teachingSteps.flatMap(step=>step.checks.map(check=>check.id)));
const oldChecks=['step-04-holes','step-05-guide','step-05-fastener','step-01-interface'];
assert.deepEqual(validateStoredIds({schemaVersion:1,tutorialId:TEACHING_ID,ids:oldChecks},allowedChecks),['step-01-interface'],'Obsolete per-item completion checks must not survive the sequence change');
console.log(JSON.stringify({status:'passed',stages:10,version2StageMigrations:9,originalOrderMigrations:3,changedStagesRequireRecheck:true,unchangedCompletionsRetained:true,currentProgressRoundtrip:true}));
