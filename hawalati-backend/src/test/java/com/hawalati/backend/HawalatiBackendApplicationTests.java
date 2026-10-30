package com.hawalati.backend;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@Disabled("External PostgreSQL context test; security tests use an isolated in-memory database")
class HawalatiBackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
