import { SYLLABUS_DATA } from '../data/syllabusData';

/**
 * PROJECT AETHER CORE: GRANULAR CHAPTER-BASED SCHEDULER
 */

// Heuristics for chapter counts since we can't fetch every book doc in the generation loop.
const COMPLETE_CHAPTER_COUNT = 8;
const SUMMARY_CHAPTER_COUNT = 3;

const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Helper to generate varied chapter chunks (1, 2, or 3) for a book.
 * This makes the study plan feel less robotic.
 */
const generateDynamicChunks = (totalChapters: number): { start: number; end: number }[] => {
  const chunks: { start: number; end: number }[] = [];
  let current = 1;

  while (current <= totalChapters) {
    const remaining = totalChapters - current + 1;
    
    // Weighted randomization:
    // 2 is the sweet spot (60%)
    // 3 is for heavy lifting (25%)
    // 1 is for a light review (15%)
    const rand = Math.random();
    let size = 2;
    if (rand < 0.15) size = 1;
    else if (rand > 0.75) size = 3;

    // Ensure we don't exceed the book's total chapters
    size = Math.min(size, remaining);
    
    chunks.push({
      start: current,
      end: current + size - 1
    });
    
    current += size;
  }
  return chunks;
};

/**
 * Generates both Complete and Summary schedules based on duration and intensity.
 */
export const generateGranularStudyPlan = (
  subjectList: string[],
  durationDays: number,
  intensity: number = 2, // Subjects per day
  excludeWeekends: boolean = false
): { complete: Record<string, string[]>, summary: Record<string, string[]> } => {
  
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  // English always first
  const prioritizedSubjects = [
    ...subjectList.filter(s => s === 'English Language'),
    ...subjectList.filter(s => s !== 'English Language').sort()
  ];

  // Helper to build a schedule for a specific tier
  const buildTierSchedule = (chapterEstimate: number) => {
    const schedule: Record<string, string[]> = {};
    
    // Create chapter queues for each subject
    const subjectQueues: Record<string, string[]> = {};
    let totalMissionUnits = 0;

    prioritizedSubjects.forEach(subject => {
      const categories = SYLLABUS_DATA[subject] || [];
      const queue: string[] = [];
      
      categories.forEach(cat => {
        if (cat.subtopics) {
          cat.subtopics.forEach(sub => {
             // PROJECT AETHER V3: DYNAMIC DISTRIBUTION
             // Instead of a fixed +2 loop, we generate varied chunks
             const chunks = generateDynamicChunks(chapterEstimate);
             chunks.forEach(chunk => {
                queue.push(`${subject}|${cat.topic}|${sub}|${chunk.start}|${chunk.end}`);
             });
          });
        }
      });
      subjectQueues[subject] = queue;
      totalMissionUnits += queue.length;
    });

    let dayOffset = 0;
    let remainingMissions = totalMissionUnits;
    let rotationIndex = 0;

    // Distribute the queue across valid days
    while (remainingMissions > 0 && dayOffset < 730) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + dayOffset);
      
      if (excludeWeekends) {
        const day = currentDate.getDay();
        if (day === 0 || day === 6) {
          dayOffset++;
          continue;
        }
      }

      const dateKey = getLocalDateString(currentDate);
      const dailyMissions: string[] = [];

      // Fill intensity slots for the day (e.g. 2 subjects per day)
      for (let i = 0; i < intensity; i++) {
        let found = false;
        // Search through subjects in rotation
        for (let j = 0; j < prioritizedSubjects.length; j++) {
            const checkIdx = (rotationIndex + j) % prioritizedSubjects.length;
            const subj = prioritizedSubjects[checkIdx];
            if (subjectQueues[subj] && subjectQueues[subj].length > 0) {
                dailyMissions.push(subjectQueues[subj].shift()!);
                remainingMissions--;
                found = true;
                // Move rotation index to next subject for next slot/day
                rotationIndex = (checkIdx + 1) % prioritizedSubjects.length;
                break;
            }
        }
        if (!found) break;
      }

      if (dailyMissions.length > 0) schedule[dateKey] = dailyMissions;
      dayOffset++;
    }

    return schedule;
  };

  return {
    complete: buildTierSchedule(COMPLETE_CHAPTER_COUNT),
    summary: buildTierSchedule(SUMMARY_CHAPTER_COUNT)
  };
};

/**
 * Adaptive Remapping: Reschedules remaining content when a user falls behind.
 */
export const rescheduleRemainingMissions = (
    uncompletedMissions: string[],
    mode: 'EXTEND' | 'SQUEEZE',
    currentEndDate: Date,
    intensity: number,
    excludeWeekends: boolean
): { schedule: { [date: string]: string[] }, newEndDate: Date } => {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const subjectQueues: Record<string, string[]> = {};
    const subjectListSet = new Set<string>();
    
    uncompletedMissions.forEach(m => {
        const subj = m.split('|')[0];
        subjectListSet.add(subj);
        if (!subjectQueues[subj]) subjectQueues[subj] = [];
        subjectQueues[subj].push(m);
    });

    const prioritizedSubjects = [
        ...Array.from(subjectListSet).filter(s => s === 'English Language'),
        ...Array.from(subjectListSet).filter(s => s !== 'English Language').sort()
    ];

    const totalMissions = uncompletedMissions.length;
    let targetEndDate = new Date(currentEndDate);

    // If extending, push the deadline based on work remaining
    if (mode === 'EXTEND') {
        const rawDaysNeeded = Math.ceil(totalMissions / intensity);
        const calendarDaysNeeded = excludeWeekends ? Math.ceil(rawDaysNeeded * 1.4) : rawDaysNeeded;
        targetEndDate = new Date(startDate);
        targetEndDate.setDate(startDate.getDate() + calendarDaysNeeded + 2);
    }

    const schedule: Record<string, string[]> = {};
    let dayOffset = 0;
    let remaining = totalMissions;
    let rotIdx = 0;

    while (remaining > 0 && dayOffset < 730) {
        const curr = new Date(startDate);
        curr.setDate(startDate.getDate() + dayOffset);
        if (excludeWeekends) {
            const dw = curr.getDay();
            if (dw === 0 || dw === 6) { dayOffset++; continue; }
        }
        const dk = getLocalDateString(curr);
        const daily: string[] = [];
        for (let i = 0; i < intensity; i++) {
            let f = false;
            for (let j = 0; j < prioritizedSubjects.length; j++) {
                const cIdx = (rotIdx + j) % prioritizedSubjects.length;
                const s = prioritizedSubjects[cIdx];
                if (subjectQueues[s]?.length > 0) {
                    daily.push(subjectQueues[s].shift()!);
                    remaining--; f = true; rotIdx = (cIdx + 1) % prioritizedSubjects.length;
                    break;
                }
            }
            if (!f) break;
        }
        if (daily.length > 0) schedule[dk] = daily;
        dayOffset++;
    }
    
    return { schedule, newEndDate: targetEndDate };
};