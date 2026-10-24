use std::collections::VecDeque;
use std::sync::Mutex;

const MAX_LINES: usize = 1000;

static LINES: Mutex<VecDeque<String>> = Mutex::new(VecDeque::new());

pub fn push(level: &str, message: String) {
    let line = format!("{} {} {}", chrono::Local::now().format("%H:%M:%S"), level, message);
    if level == "ERROR" {
        eprintln!("{}", line);
    } else {
        println!("{}", line);
    }
    if let Ok(mut lines) = LINES.lock() {
        if lines.len() >= MAX_LINES {
            lines.pop_front();
        }
        lines.push_back(line);
    }
}

pub fn recent() -> Vec<String> {
    LINES.lock().map(|l| l.iter().cloned().collect()).unwrap_or_default()
}

#[macro_export]
macro_rules! flog {
    ($($arg:tt)*) => { $crate::common::logs::push("INFO", format!($($arg)*)) };
}

#[macro_export]
macro_rules! flog_err {
    ($($arg:tt)*) => { $crate::common::logs::push("ERROR", format!($($arg)*)) };
}
