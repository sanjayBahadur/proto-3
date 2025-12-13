declare module "ical.js" {
  export function parse(input: string): unknown[];

  export class Component {
    constructor(jCal: unknown[] | string);
    name: string;
    getAllSubcomponents(name?: string): Component[];
    getFirstSubcomponent(name?: string): Component | null;
    getFirstPropertyValue(name: string): unknown;
    getFirstProperty(name: string): Property | null;
    getAllProperties(name?: string): Property[];
    addSubcomponent(component: Component): void;
    removeSubcomponent(component: Component): void;
    addProperty(property: Property): void;
    removeProperty(property: Property): void;
    toJSON(): unknown[];
  }

  export class Property {
    constructor(jCal: unknown[] | string, parent?: Component);
    name: string;
    type: string;
    getFirstValue(): unknown;
    getValues(): unknown[];
    setValue(value: unknown): void;
    setParameter(name: string, value: string | string[]): void;
    getParameter(name: string): string | string[] | undefined;
    toJSON(): unknown[];
  }

  export class Event {
    constructor(component?: Component, options?: { strictExceptions?: boolean; exceptions?: Component[] });
    component: Component;
    uid: string;
    summary: string;
    description: string;
    location: string;
    startDate: Time;
    endDate: Time;
    duration: Duration;
    sequence: number;
    recurrenceId: Time | null;
    isRecurrenceException(): boolean;
    iterator(startTime?: Time): RecurExpansion;
  }

  export class Time {
    constructor(data?: {
      year?: number;
      month?: number;
      day?: number;
      hour?: number;
      minute?: number;
      second?: number;
      isDate?: boolean;
      timezone?: string;
    });
    
    static fromJSDate(date: Date, useUTC?: boolean): Time;
    static fromString(str: string, property?: Property): Time;
    static now(): Time;

    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    isDate: boolean;
    zone: Timezone | null;

    clone(): Time;
    toJSDate(): Date;
    toICALString(): string;
    toString(): string;
    compare(other: Time): number;
    addDuration(duration: Duration): void;
    subtractDate(other: Time): Duration;
    adjust(days: number, hours: number, minutes: number, seconds: number, time?: Time): void;
  }

  export class Duration {
    constructor(data?: {
      weeks?: number;
      days?: number;
      hours?: number;
      minutes?: number;
      seconds?: number;
      isNegative?: boolean;
    });
    
    static fromString(str: string): Duration;
    
    weeks: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isNegative: boolean;
    
    clone(): Duration;
    toSeconds(): number;
    toString(): string;
    compare(other: Duration): number;
  }

  export class Timezone {
    constructor(data: Component | { component: Component; tzid?: string });
    static localTimezone: Timezone;
    static utcTimezone: Timezone;
    tzid: string;
    component: Component;
    expandedUntilYear: number;
  }

  export class RecurExpansion {
    constructor(options: { component: Component; dtstart: Time });
    next(): Time | null;
    complete: boolean;
  }

  export class Recur {
    constructor(data?: {
      freq?: string;
      interval?: number;
      wkst?: number;
      until?: Time;
      count?: number;
      bysecond?: number[];
      byminute?: number[];
      byhour?: number[];
      byday?: string[];
      bymonthday?: number[];
      byyearday?: number[];
      byweekno?: number[];
      bymonth?: number[];
      bysetpos?: number[];
    });

    static fromString(str: string): Recur;

    freq: string;
    interval: number;
    until: Time | null;
    count: number | null;

    clone(): Recur;
    toString(): string;
    iterator(startTime?: Time): RecurIterator;
  }

  export class RecurIterator {
    next(): Time;
    completed: boolean;
  }
}

