import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import type { ChinaWorkdayHelper } from "../hooks/useChinaWorkdays";

type WorkdaySyncCardProps = {
  chinaWorkdays: ChinaWorkdayHelper;
};

export const WorkdaySyncCard = ({ chinaWorkdays }: WorkdaySyncCardProps) => (
  <Card elevation={0} variant="outlined" sx={{ borderRadius: 3 }}>
    <CardContent>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="overline" color="text.secondary">
            工作日同步
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            中国法定节假日
          </Typography>
          <Typography color="text.secondary">
            {chinaWorkdays.hasData
              ? `已同步 · 数据更新时间 ${chinaWorkdays.lastUpdatedText ?? "未知"}`
              : "尚未同步，暂按周一至周五计算工作日"}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            数据来源：
            <Box
              component="a"
              href={chinaWorkdays.sourceUrl}
              target="_blank"
              rel="noreferrer"
              sx={{ color: "primary.main", ml: 0.5 }}
            >
              china-holiday-calender
            </Box>
          </Typography>
        </Box>
        <Stack spacing={1} alignItems={{ xs: "stretch", sm: "flex-end" }} sx={{ minWidth: { sm: 220 } }}>
          <Chip
            label={
              chinaWorkdays.loading
                ? "同步中..."
                : chinaWorkdays.error
                  ? "同步失败，使用默认规则"
                  : "已同步"
            }
            color={
              chinaWorkdays.loading
                ? "default"
                : chinaWorkdays.error
                  ? "warning"
                  : "success"
            }
          />
          <Button
            variant="outlined"
            onClick={chinaWorkdays.refresh}
            disabled={chinaWorkdays.loading}
            fullWidth
          >
            {chinaWorkdays.loading ? "同步中..." : "重新同步"}
          </Button>
        </Stack>
      </Stack>
      {chinaWorkdays.error && (
        <Typography variant="body2" color="error" sx={{ mt: 2 }}>
          {chinaWorkdays.error}
        </Typography>
      )}
    </CardContent>
  </Card>
);

