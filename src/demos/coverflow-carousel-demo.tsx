// This is a file with a demo for your component
// That's what users will see in the preview
// Create new files in this directory to add more demos
"use client";

import { CoverflowCarousel } from "@/components/ui/coverflow-carousel";

const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=640&h=640&fit=crop&q=70&auto=format`;

const SLIDES = [
  {
    src: UNSPLASH("1506905925346-21bda4d32df4"),
    alt: "Mountain peaks rising above a sea of clouds",
    title: "Tidewater",
    subtitle: "Long Player",
    meta: [
      { label: "Year", value: "2019" },
      { label: "Producer", value: "Ada Ferrow" },
      { label: "Length", value: "3:42" },
    ],
  },
  {
    src: UNSPLASH("1469474968028-56623f02e42e"),
    alt: "Sun rising over a mountain valley",
    title: "Nightshift",
    subtitle: "Long Player",
    meta: [
      { label: "Year", value: "2021" },
      { label: "Producer", value: "Kell Mora" },
      { label: "Length", value: "4:08" },
    ],
  },
  {
    src: UNSPLASH("1447752875215-b2761acb3c5d"),
    alt: "Road running through a tall forest",
    title: "Overexposed",
    subtitle: "Single",
    meta: [
      { label: "Year", value: "2018" },
      { label: "Producer", value: "Juno Vale" },
      { label: "Length", value: "2:57" },
    ],
  },
  {
    src: UNSPLASH("1426604966848-d7adac402bff"),
    alt: "Granite cliffs above a forested valley",
    title: "Slow Bloom",
    subtitle: "EP",
    meta: [
      { label: "Year", value: "2022" },
      { label: "Producer", value: "Rue Alcott" },
      { label: "Length", value: "3:15" },
    ],
  },
  {
    src: UNSPLASH("1472214103451-9374bd1c798e"),
    alt: "Green hills under a cloudy sky",
    title: "Open Palm",
    subtitle: "Single",
    meta: [
      { label: "Year", value: "2020" },
      { label: "Producer", value: "Ada Ferrow" },
      { label: "Length", value: "3:01" },
    ],
  },
  {
    src: UNSPLASH("1470071459604-3b5ec3a7fe05"),
    alt: "Fog rolling through a forested valley at first light",
    title: "Low Country",
    subtitle: "Long Player",
    meta: [
      { label: "Year", value: "2017" },
      { label: "Producer", value: "Sim Oyo" },
      { label: "Length", value: "5:20" },
    ],
  },
  {
    src: UNSPLASH("1500534314209-a25ddb2bd429"),
    alt: "Sunlit dune ridge under a hard blue sky",
    title: "Dry Season",
    subtitle: "EP",
    meta: [
      { label: "Year", value: "2016" },
      { label: "Producer", value: "Juno Vale" },
      { label: "Length", value: "2:44" },
    ],
  },
  {
    src: UNSPLASH("1441974231531-c6227db76b6e"),
    alt: "Sunlight breaking through a dense stand of trees",
    title: "Understory",
    subtitle: "Single",
    meta: [
      { label: "Year", value: "2023" },
      { label: "Producer", value: "Kell Mora" },
      { label: "Length", value: "3:38" },
    ],
  },
  {
    src: UNSPLASH("1493246507139-91e8fad9978e"),
    alt: "Pastel abstract of coloured smoke against a pale ground",
    title: "Paper Lantern",
    subtitle: "Single",
    meta: [
      { label: "Year", value: "2021" },
      { label: "Producer", value: "Rue Alcott" },
      { label: "Length", value: "2:19" },
    ],
  },
  {
    src: UNSPLASH("1501785888041-af3ef285b470"),
    alt: "Mountain lake mirroring a ridgeline at dusk",
    title: "Still Water",
    subtitle: "Long Player",
    meta: [
      { label: "Year", value: "2015" },
      { label: "Producer", value: "Ada Ferrow" },
      { label: "Length", value: "4:51" },
    ],
  },
  {
    src: UNSPLASH("1465101162946-4377e57745c3"),
    alt: "Long exposure of light trails over a dark landscape",
    title: "Third Rail",
    subtitle: "EP",
    meta: [
      { label: "Year", value: "2024" },
      { label: "Producer", value: "Sim Oyo" },
      { label: "Length", value: "3:07" },
    ],
  },
  {
    src: UNSPLASH("1519681393784-d120267933ba"),
    alt: "Snow-covered peak lit by a cold morning sun",
    title: "Undertow",
    subtitle: "Single",
    meta: [
      { label: "Year", value: "2020" },
      { label: "Producer", value: "Juno Vale" },
      { label: "Length", value: "3:29" },
    ],
  },
];

// ONLY DEFAULT EXPORT WILL BE TREATED AS A DEMO
export default function DemoOne() {
  return (
    <div className="w-full overflow-hidden bg-background py-6">
      <CoverflowCarousel slides={SLIDES} showCaption />
    </div>
  );
}
