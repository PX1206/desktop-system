package com.desktop.system;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = {"com.desktop.common", "com.desktop.system"})
@EnableScheduling
public class DesktopApplication {

    public static void main(String[] args) {
        SpringApplication.run(DesktopApplication.class, args);
    }
}
