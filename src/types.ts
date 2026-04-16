export type Lecture = {
  id: string;
  title: string;
  duration: string;
  streamUrl: string;
};

export type Course = {
  id: string;
  name: string;
  lectures: Lecture[];
};
