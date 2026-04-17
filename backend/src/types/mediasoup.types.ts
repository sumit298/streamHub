import type { Router, Producer, WebRtcTransport, Consumer } from "mediasoup/types";

export interface Participant {
  id: string;
  transports: Map<string, WebRtcTransport>;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
  joinedAt: number;
}

export interface Room {
  id: string;
  router: Router;
  participants: Map<string, Participant>;
  createdAt: number;
  workerIndex: number;
}
