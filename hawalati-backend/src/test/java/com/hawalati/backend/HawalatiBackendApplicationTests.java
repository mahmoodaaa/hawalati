package com.hawalati.backend;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class HawalatiBackendApplicationTests {

	@Test
	@Disabled("Requires PostgreSQL, DB_PASSWORD, and JWT_SECRET")
	void contextLoads() {
	}

}
