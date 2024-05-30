"use client";
import { useEffect, useState, useRef } from "react";
import { getGroqCompletion } from "@/ai/groq";
import { generateImageFal } from "@/ai/fal";
import { getGeminiVision } from "@/ai/gemini";
import Panorama from "@/components/Panorama";
import Spinner from "@/components/Spinner";
import Narration from "@/components/Narration";

export default function Page() {
  const [fetching, setFetching] = useState(false);
  const [img, setImg] = useState("/old_depot_2k.hdr");
  const [currentLocation, setCurrentLocation] = useState("");
  const [selectedImg, setSelectedImage] = useState("");
  const [description, setDescription] = useState("Hold shift and drag to screencap");
  const [locations, setLocations] = useState<string[]>([]);
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tourData, setTourData] = useState<{ description: string, img: string }[]>([]);
  const [tourStarted, setTourStarted] = useState(false);
  const [volumeOn, setVolumeOn] = useState(true);
  const [narrationPlaying, setNarrationPlaying] = useState(false);

  // Audio state and ref
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio && volumeOn) {
      audio.play().catch(err => console.error("Audio play error:", err));
    }
  }, [volumeOn]);

  // Function to toggle volume
  const toggleVolume = () => {
    setVolumeOn(prevVolume => !prevVolume);
  };

  const handleCreate = async () => {
    setFetching(true);
    setError(null);
    setTourStarted(true);
    setNarrationPlaying(false); // Reset narration state when starting a new tour

    try {
      const theme = await getGroqCompletion("travel tour theme", 100);
      const locationsResponse = await getGroqCompletion(
        `${theme} Contiki or Grand Tour destinations in JSON format`,
        200,
        `system prompt describing how to make your description. 
        Return your response in JSON in the following format {locations:string[]}
        `,
        true
      );
      const locJSON = JSON.parse(locationsResponse);
      const locations = locJSON.locations.slice(0, 5); // Limit to 5 locations
      setLocations(locations);
      setCurrentLocation(locations[0]);
      setCurrentLocationIndex(0);
      await handleUpdateImage(locations[0]);
    } catch (error) {
      console.error("Error fetching locations:", error);
      setError("Failed to fetch locations. Please try again later.");
    } finally {
      setFetching(false);
    }
  };

  const handleUpdateImage = async (loc: string) => {
    setFetching(true);
    setError(null);

    try {
      const newPrompt = `A equirectangular Google street view photograph of a famous landmark or scenic location included in the ${loc} itinerary for a Contiki or Grand Tour. Canon EOS 5D Mark IV, 24mm, f/8, 1/250s, ISO 100, 2019`;
      const pano = await generateImageFal(
        newPrompt,
        { width: 1344, height: 1024 },
        "hyper-sdxl"
      );
      if (pano) setImg(pano);
    } catch (error) {
      console.error("Error generating panoramic image:", error);
      setError("Failed to generate panoramic image. Please try again later.");
    } finally {
      setFetching(false);
    }
  };

  const handleSelect = async (imgUrl: string) => {
    if (tourData.length >= 5) {
      handleEndTour();
      return;
    }

    setFetching(true);
    setError(null);
    setNarrationPlaying(true); // Set narration state to true when selecting an image

    try {
      setSelectedImage(imgUrl);
      const description = await getGeminiVision(
        `You will be provided with a screenshot from an image of a popular Contiki Tour or Grand Tour destination. Vividly describe the content in the image in as much detail as possible.`,
        imgUrl
      );
      setDescription(description);

      const nextIndex = (currentLocationIndex + 1) % locations.length;
      setCurrentLocation(locations[nextIndex]);
      setCurrentLocationIndex(nextIndex);

      await handleUpdateImage(locations[nextIndex]);
      collectTourData(description, imgUrl);
    } catch (error) {
      console.error("Error handling image selection:", error);
      setError("Failed to handle image selection. Please try again later.");
    } finally {
      setFetching(false);
    }
  };

  const collectTourData = (description: string, img: string) => {
    setTourData(prevData => [...prevData, { description, img }]);
  };

  const handleEndTour = () => {
    setNarrationPlaying(false); // Stop narration when tour ends
  };

  const handleNarration = (narration: string) => {
    // Here, you can implement the logic to play the narration as audio
    // For example, you can use a text-to-speech library or service
    // to convert the narration text to audio and play it
    console.log("Narration:", narration);
  };

  if (typeof window === "undefined") {
    return null;
  }

  return (
    <main className="main-container">
      {!tourStarted && (
        <>
          <h1 className="text-8xl font-bold mb-4 flash-title">Travel Bug</h1>
          <p className="intro-text">Welcome to the whirlwind adventure of Contiki Tourism, where the only thing faster than your bus is your guide's spiel about local history! Get ready to take snapshots of more monuments than you can remember! Take a snapshot of the interesting scenery in your destination to find out more about what you see.</p>
          <button className="start-tour-button" onClick={handleCreate} disabled={fetching}>
            {fetching ? "Loading..." : "Start Tour"}
          </button>
          <div className="volume-control-container">
            <button onClick={toggleVolume} className="volume-control-button">
              {volumeOn ? "Turn off volume" : "Turn on volume"}
            </button>
          </div>
          <img src="/bus-png-40047.png" alt="Bus" className="bus bus-image" />
        </>
      )}
      {tourStarted && (
        <>
          <div className="flex justify-between gap-4 m-2">
            <input
              className="w-full rounded location-input"
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              disabled
            />
          </div>
          <div className="relative w-full h-full">
            {fetching ? (
              <Spinner />
            ) : error ? (
              <p className="text-red-500 text-lg">{error}</p>
            ) : (
              <>
                <Panorama img={img} onSelect={handleSelect} immersive={false} />
                <div className="absolute top-0 left-0 p-4 flex flex-col max-w-sm">
                  <p className="text-xs bg-white p-2">{description}</p>
                  <div className="relative">
                    {selectedImg && (
                      <img
                        className="w-full h-full"
                        src={selectedImg}
                        alt="Selected area"
                      />
                    )}
                  </div>
                </div>
                {/* Add the Narration component */}
                <Narration
                  play={narrationPlaying}
                  textToNarrate={description}
                  captionPrompt="Describe the content in the image as a funny tourist guide would, in as much detail as possible."
                  imagePrompt="A equirectangular Google street view photograph of a famous landmark or scenic location. Canon EOS 5D Mark IV, 24mm, f/8, 1/250s, ISO 100, 2019"
                />
              </>
            )}
          </div>
        </>
      )}
      {volumeOn && (
        <audio ref={audioRef} loop>
          <source src="/example-audio.mp3" type="audio/mpeg" />
        </audio>
      )}
    </main>
  );
}