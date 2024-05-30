"use client";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Environment,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import { SelectionArea } from "./SelectImageRegion";

export default function Panorama({
  img,
  onSelect,
  immersive = true,
}: {
  img: string;
  onSelect: (imgUrl: string) => void;
  immersive: boolean;
}) {
  const [fov, setFov] = useState(100);
  const [selection, setSelection] = useState<SelectionArea>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [isSelecting, setIsSelecting] = useState(false);
  const [finalSelection, setFinalSelection] = useState<SelectionArea | null>(
    null
  );
  const [controlsDisabled, setControlsDisabled] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleWheel = (deltaY: number) => {
    setFov((prevFov) => {
      let newFov = prevFov + deltaY * 0.05;
      newFov = Math.max(10, Math.min(newFov, 150));
      return newFov;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsSelecting(true);
    const { offsetX, offsetY } = e.nativeEvent;
    setSelection({ x: offsetX, y: offsetY, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isSelecting) {
      const { offsetX, offsetY } = e.nativeEvent;
      setSelection((prevSelection) => ({
        ...prevSelection,
        width: offsetX - prevSelection.x,
        height: offsetY - prevSelection.y,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    if (controlsDisabled) setFinalSelection(selection);
  };

  return (
    <>
      <div
        ref={canvasRef}
        style={{ position: "relative", width: "100%", height: "100%" }}
      >
        <Canvas
          onWheel={(e) => handleWheel(e.deltaY)}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onKeyDown={(e) => setControlsDisabled(e.key === "Shift")}
          onKeyUp={() => setControlsDisabled(false)}
          tabIndex={0}
          gl={{ preserveDrawingBuffer: true }}
        >
          <Environment files={img} background />
          <OrbitControls
            enabled={!controlsDisabled}
            target={[1, 0, 0]}
            maxPolarAngle={immersive ? Math.PI : Math.PI - Math.PI / 3}
            minPolarAngle={immersive ? 0 : Math.PI / 3}
            minAzimuthAngle={immersive ? -Infinity : -Math.PI}
            maxAzimuthAngle={immersive ? Infinity : 0}
            minZoom={immersive ? 0 : 0.5}
            autoRotate={false}
            autoRotateSpeed={0.2}
          />
          <PerspectiveCamera makeDefault position={[0, 0, 0]} fov={fov} />
          <SelectionHandler selectionArea={finalSelection} onSelect={onSelect} />
        </Canvas>
        {isSelecting && (
          <div
            style={{
              position: "absolute",
              top: selection.y,
              left: selection.x,
              width: Math.abs(selection.width),
              height: Math.abs(selection.height),
              border: "2px solid red",
              pointerEvents: "none",
            }}
          ></div>
        )}
      </div>
    </>
  );
}

const SelectionHandler = ({
  selectionArea,
  onSelect,
}: {
  selectionArea: SelectionArea | null;
  onSelect: (imgUrl: string) => void;
}) => {
  const { gl } = useThree();

  useEffect(() => {
    if (!selectionArea) return;

    const { x, y, width, height } = selectionArea;
    if (width === 0 || height === 0) {
      console.error("Invalid selection area");
      return;
    }

    const offScreenCanvas = document.createElement("canvas");
    offScreenCanvas.width = Math.abs(width);
    offScreenCanvas.height = Math.abs(height);
    const offScreenContext = offScreenCanvas.getContext("2d");
    if (!offScreenContext) return;
    offScreenContext.drawImage(
      gl.domElement,
      selectionArea.x,
      selectionArea.y,
      selectionArea.width,
      selectionArea.height,
      0,
      0,
      Math.abs(selectionArea.width),
      Math.abs(selectionArea.height)
    );
    //call the callback function and provide the image
    onSelect(offScreenCanvas.toDataURL("image/png"));
  }, [selectionArea, gl, onSelect]);

  return null;
};
