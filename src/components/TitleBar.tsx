import { useCallback, useEffect, useState } from "react";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import AlarmOnIcon from "@mui/icons-material/AlarmOn";
import RemoveIcon from "@mui/icons-material/Remove";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import FilterNoneIcon from "@mui/icons-material/FilterNone";
import CloseIcon from "@mui/icons-material/Close";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { isTauriEnvironment } from "../utils/alarm";

export function TitleBar() {
  const isTauri = isTauriEnvironment();
  const currentWindow = isTauri ? getCurrentWindow() : null;
  const [isMaximized, setIsMaximized] = useState(false);

  const syncMaximizeState = useCallback(async () => {
    if (!currentWindow) return;
    const state = await currentWindow.isMaximized();
    setIsMaximized(state);
  }, [currentWindow]);

  useEffect(() => {
    if (!currentWindow) return;
    let cancelled = false;

    const updateState = async () => {
      const state = await currentWindow.isMaximized();
      if (!cancelled) {
        setIsMaximized(state);
      }
    };
    updateState();

    const unlistenPromise = currentWindow.onResized(() => {
      updateState();
    });

    return () => {
      cancelled = true;
      unlistenPromise.then((unlisten: UnlistenFn) => unlisten()).catch(() => {});
    };
  }, [currentWindow]);

  const handleMinimize = async () => {
    if (!currentWindow) return;
    await currentWindow.minimize();
  };

  const handleToggleMaximize = async () => {
    if (!currentWindow) return;
    await currentWindow.toggleMaximize();
    await syncMaximizeState();
  };

  const handleClose = async () => {
    if (!currentWindow) return;
    await currentWindow.close();
  };

  return (
    <Box
      data-tauri-drag-region={isTauri ? "true" : undefined}
      onDoubleClick={handleToggleMaximize}
      sx={{
        height: 44,
        px: 2,
        display: "flex",
        alignItems: "center",
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        backgroundColor: (theme) => theme.palette.background.paper,
        userSelect: "none",
      }}
    >
      <Stack direction="row" alignItems="center" sx={{ flexGrow: 1 }} spacing={1}>
        <AlarmOnIcon color="primary" fontSize="small" />
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Assassin Alarm Clock
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} data-tauri-drag-region="false">
        <IconButton
          size="small"
          onClick={handleMinimize}
          aria-label="最小化"
          disabled={!isTauri}
          sx={{ borderRadius: 1 }}
        >
          <RemoveIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={handleToggleMaximize}
          aria-label={isMaximized ? "还原" : "最大化"}
          disabled={!isTauri}
          sx={{ borderRadius: 1 }}
        >
          {isMaximized ? <FilterNoneIcon fontSize="small" /> : <CheckBoxOutlineBlankIcon fontSize="small" />}
        </IconButton>
        <IconButton
          size="small"
          onClick={handleClose}
          aria-label="关闭"
          disabled={!isTauri}
          sx={{
            borderRadius: 1,
            "&:hover": {
              backgroundColor: (theme) => theme.palette.error.light,
              color: (theme) => theme.palette.error.contrastText,
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}

