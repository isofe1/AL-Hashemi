import type { Course } from '../types';

export const courses: Course[] = [
  {
    id: 'physics-2026',
    name: 'Physics 2026',
    lectures: [
      {
        id: 'kinematics-01',
        title: 'Kinematics - Part 1',
        duration: '42:10',
        streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
      },
      {
        id: 'kinematics-02',
        title: 'Kinematics - Part 2',
        duration: '38:25',
        streamUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
      }
    ]
  }
];
